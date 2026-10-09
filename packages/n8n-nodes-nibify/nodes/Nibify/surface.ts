/**
 * The Simple composition mode: a title, a text and buttons, turned into an A2UI surface
 * that conforms to the Nibify catalog (ADR-0001), plus the matching quick actions.
 */
import type { QuickAction, Surface } from './operations.ts';

export type ButtonStyle = 'primary' | 'default' | 'borderless';

export interface SimpleButton {
  label: string;
  action: string;
  style: ButtonStyle;
}

export interface SimpleCard {
  title: string;
  text: string;
  buttons: SimpleButton[];
}

export interface Composed {
  surface: Surface;
  quickActions: QuickAction[];
}

export function composeSimple(card: SimpleCard): Composed {
  const title = card.title.trim();
  const text = card.text.trim();
  if (!title) throw new Error('A title is required.');
  if (card.buttons.length === 0) throw new Error('Add at least one button.');

  const seen = new Set<string>();
  for (const { label, action } of card.buttons) {
    if (!label.trim()) throw new Error('Every button needs a label.');
    if (!action.trim()) throw new Error(`The button "${label}" needs an action name.`);
    if (seen.has(action)) {
      throw new Error(`Two buttons share the action name "${action}".`);
    }
    seen.add(action);
  }

  const buttons = card.buttons.flatMap(({ label, action, style }, index) => [
    {
      id: `button-${index}`,
      component: 'Button',
      variant: style,
      child: `button-${index}-label`,
      action: { event: { name: action, context: {} } },
    },
    { id: `button-${index}-label`, component: 'Text', text: label },
  ]);

  return {
    surface: {
      root: 'root',
      dataModel: {},
      components: [
        { id: 'root', component: 'Card', child: 'body' },
        {
          id: 'body',
          component: 'Column',
          children: text ? ['title', 'text', 'actions'] : ['title', 'actions'],
        },
        { id: 'title', component: 'Text', text: title, variant: 'h4' },
        ...(text ? [{ id: 'text', component: 'Text', text }] : []),
        {
          id: 'actions',
          component: 'Row',
          justify: 'end',
          children: card.buttons.map((_, index) => `button-${index}`),
        },
        ...buttons,
      ],
    },
    quickActions: card.buttons.map(({ label, action }) => ({ name: action, label })),
  };
}

/** A surface pasted in JSON mode: only its envelope is checked here, the API checks the rest. */
export function parseSurface(value: unknown): Surface {
  const surface = typeof value === 'string' ? parseJson(value) : value;
  if (
    typeof surface !== 'object' ||
    surface === null ||
    typeof (surface as Surface).root !== 'string' ||
    typeof (surface as Surface).dataModel !== 'object' ||
    !Array.isArray((surface as Surface).components)
  ) {
    throw new Error(
      'The surface must be JSON: an A2UI object with "root", "dataModel" and "components".',
    );
  }
  return surface as Surface;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
