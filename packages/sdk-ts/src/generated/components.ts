// Generated from catalog/catalog.json by `pnpm generate`. Do not edit: the components test compares.

export type ComponentId = string;

export type AccessibilityAttributes = {
  /**
   * A short string, typically 1 to 3 words, used by assistive technologies to convey the purpose or intent of an element. For example, an input field might have an accessible label of 'User ID' or a button might be labeled 'Submit'.
   */
  label?: DynamicString;
  /**
   * Additional information provided by assistive technologies about an element such as instructions, format requirements, or result of an action. For example, a mute button might have a label of 'Mute' and a description of 'Silences notifications about this conversation'.
   */
  description?: DynamicString;
  /**
   * Controls screen reader announcements for dynamic updates (WAI-ARIA aria-live). 'polite' waits for user pause; 'assertive' interrupts immediately for alerts.
   * @default "off"
   */
  live?: 'off' | 'polite' | 'assertive';
  /**
   * Hides the element and its children from assistive technologies when true. Default is false.
   */
  hidden?: DynamicBoolean;
};

export type DynamicString = string | DataBinding | FunctionCall;

export type DataBinding = {
  /**
   * A JSON Pointer path to a value in the data model.
   */
  '@path': string;
};

export type FunctionCall = { [key: string]: unknown } & (FunctionCommon &
  (anyFunction | IndexSystemFunction));

export type FunctionCommon = {
  /**
   * The name of the function to call.
   */
  '@call': string;
  /**
   * The catalog ID for this function, overriding any surface-level default catalogId.
   */
  catalogId?: string;
};

export type anyFunction = required | regex;

export type required = {
  '@call': 'required';
  args: {
    /**
     * The value to check.
     */
    value: unknown;
  };
};

export type regex = {
  '@call': 'regex';
  args: {
    value: DynamicString;
    /**
     * The regular expression to search for in the value. Uses the A2UI regex dialect: a portable subset of ECMAScript pattern syntax in Unicode mode with no flags. Matching is case-sensitive, '.' excludes line terminators, and '^' and '$' match only at the ends of the value. Backreferences, lookbehind, named groups and '\p{...}' are not allowed. Patterns longer than 256 code points or that could backtrack catastrophically are rejected.
     */
    pattern: string;
  };
};

export type IndexSystemFunction = {
  '@call': '@index';
  args?: {
    /**
     * Optional. An offset to add to the 0-based index (e.g., 1 for 1-based indexing). Defaults to 0.
     * @default 0
     */
    offset?: DynamicNumber;
  };
};

export type DynamicNumber = number | DataBinding | FunctionCall;

export type DynamicBoolean = boolean | DataBinding | FunctionCall;

export type Extensions = {
  [key: string]: unknown;
};

export type Weight = number;

export type ChildList =
  | Array<ComponentId>
  | {
      componentId: ComponentId;
      /**
       * The path to the list of component property objects in the data model.
       */
      path: string;
    };

export type Child = ComponentId;

export type Action =
  | {
      /**
       * The event to dispatch to the agent.
       */
      event: {
        /**
         * The name of the action to be dispatched to the agent.
         */
        name: string;
        /**
         * An optional human-readable message describing the action performed by the user, resolved by the renderer and included in the outbound action message.
         */
        userMessage?: DynamicString;
        /**
         * A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.
         */
        context?: {
          [key: string]: DynamicValue;
        };
      };
    }
  | {
      functionCall: FunctionCall;
    };

export type DynamicValue =
  string | number | boolean | unknown[] | { [key: string]: unknown } | DataBinding | FunctionCall;

export type CheckRule = {
  /**
   * Path or function call evaluating to a structured validation result object or a boolean.
   */
  condition: DataBinding | FunctionCall;
  /**
   * Optional fallback error message.
   */
  message?: string;
};

export type DynamicStringList = Array<string> | DataBinding | FunctionCall;

export type TextProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The text content to display. While simple Markdown formatting is supported (i.e. without HTML, images, or links), utilizing dedicated UI components is generally preferred for a richer and more structured presentation.
   */
  text: DynamicString;
  /**
   * A hint for the base text style.
   * @default "body"
   */
  variant?: 'caption' | 'body';
  weight?: Weight;
};

export type TextComponent = { id: ComponentId; component: 'Text' } & TextProps;

export function Text(id: ComponentId, props: TextProps): TextComponent {
  return { id, component: 'Text', ...props };
}

export type ImageProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The URL of the image to display.
   */
  url: DynamicString;
  /**
   * Accessibility text for the image.
   */
  description?: DynamicString;
  /**
   * Specifies how the image should be resized to fit its container. This corresponds to the CSS 'object-fit' property.
   * @default "fill"
   */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';
  /**
   * A hint for the image size and style.
   * @default "mediumFeature"
   */
  variant?: 'icon' | 'avatar' | 'smallFeature' | 'mediumFeature' | 'largeFeature' | 'header';
  weight?: Weight;
};

export type ImageComponent = { id: ComponentId; component: 'Image' } & ImageProps;

export function Image(id: ComponentId, props: ImageProps): ImageComponent {
  return { id, component: 'Image', ...props };
}

export type IconProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The name of the icon to display.
   */
  name:
    | (
        | 'accountCircle'
        | 'add'
        | 'arrowBack'
        | 'arrowForward'
        | 'attachFile'
        | 'calendarToday'
        | 'call'
        | 'camera'
        | 'check'
        | 'close'
        | 'delete'
        | 'download'
        | 'edit'
        | 'event'
        | 'error'
        | 'fastForward'
        | 'favorite'
        | 'favoriteOff'
        | 'folder'
        | 'help'
        | 'home'
        | 'info'
        | 'locationOn'
        | 'lock'
        | 'lockOpen'
        | 'mail'
        | 'menu'
        | 'moreVert'
        | 'moreHoriz'
        | 'notificationsOff'
        | 'notifications'
        | 'pause'
        | 'payment'
        | 'person'
        | 'phone'
        | 'photo'
        | 'play'
        | 'print'
        | 'refresh'
        | 'rewind'
        | 'search'
        | 'send'
        | 'settings'
        | 'share'
        | 'shoppingCart'
        | 'skipNext'
        | 'skipPrevious'
        | 'star'
        | 'starHalf'
        | 'starOff'
        | 'stop'
        | 'upload'
        | 'visibility'
        | 'visibilityOff'
        | 'volumeDown'
        | 'volumeMute'
        | 'volumeOff'
        | 'volumeUp'
        | 'warning'
      )
    | {
        svgPath: DynamicString;
      }
    | DataBinding;
  weight?: Weight;
};

export type IconComponent = { id: ComponentId; component: 'Icon' } & IconProps;

export function Icon(id: ComponentId, props: IconProps): IconComponent {
  return { id, component: 'Icon', ...props };
}

export type DividerProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The orientation of the divider.
   * @default "horizontal"
   */
  axis?: 'horizontal' | 'vertical';
  weight?: Weight;
};

export type DividerComponent = { id: ComponentId; component: 'Divider' } & DividerProps;

export function Divider(id: ComponentId, props: DividerProps = {}): DividerComponent {
  return { id, component: 'Divider', ...props };
}

export type RowProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list. Children cannot be defined inline, they must be referred to by ID.
   */
  children: ChildList;
  /**
   * Defines the arrangement of children along the main axis (horizontally). Use 'spaceBetween' to push items to the edges, or 'start'/'end'/'center' to pack them together.
   * @default "start"
   */
  justify?: 'center' | 'end' | 'spaceAround' | 'spaceBetween' | 'spaceEvenly' | 'start' | 'stretch';
  /**
   * Defines the alignment of children along the cross axis (vertically). This is similar to the CSS 'align-items' property, but uses camelCase values (e.g., 'start').
   * @default "stretch"
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  weight?: Weight;
};

export type RowComponent = { id: ComponentId; component: 'Row' } & RowProps;

export function Row(id: ComponentId, props: RowProps): RowComponent {
  return { id, component: 'Row', ...props };
}

export type ColumnProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list. Children cannot be defined inline, they must be referred to by ID.
   */
  children: ChildList;
  /**
   * Defines the arrangement of children along the main axis (vertically). Use 'spaceBetween' to push items to the edges (e.g. header at top, footer at bottom), or 'start'/'end'/'center' to pack them together.
   * @default "start"
   */
  justify?: 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly' | 'stretch';
  /**
   * Defines the alignment of children along the cross axis (horizontally). This is similar to the CSS 'align-items' property.
   * @default "stretch"
   */
  align?: 'center' | 'end' | 'start' | 'stretch';
  weight?: Weight;
};

export type ColumnComponent = { id: ComponentId; component: 'Column' } & ColumnProps;

export function Column(id: ComponentId, props: ColumnProps): ColumnComponent {
  return { id, component: 'Column', ...props };
}

export type ListProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list.
   */
  children: ChildList;
  /**
   * The direction in which the list items are laid out.
   * @default "vertical"
   */
  direction?: 'vertical' | 'horizontal';
  /**
   * Defines the alignment of children along the cross axis.
   * @default "stretch"
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  weight?: Weight;
};

export type ListComponent = { id: ComponentId; component: 'List' } & ListProps;

export function List(id: ComponentId, props: ListProps): ListComponent {
  return { id, component: 'List', ...props };
}

export type CardProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The ID of the single child component to be rendered inside the card. To display multiple elements, you MUST wrap them in a layout component (like Column or Row) and pass that container's ID here. Do NOT pass multiple IDs or a non-existent ID.
   */
  child: Child;
  weight?: Weight;
};

export type CardComponent = { id: ComponentId; component: 'Card' } & CardProps;

export function Card(id: ComponentId, props: CardProps): CardComponent {
  return { id, component: 'Card', ...props };
}

export type ButtonProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The ID of the child component. Use a 'Text' component for a labeled button. Only use an 'Icon' if the requirements explicitly ask for an icon-only button.
   */
  child: Child;
  /**
   * A hint for the button style. If omitted, a default button style is used. 'primary' indicates this is the main call-to-action button. 'borderless' means the button has no visual border or background, making its child content appear like a clickable link.
   * @default "default"
   */
  variant?: 'default' | 'primary' | 'borderless';
  action: Action;
  weight?: Weight;
};

export type ButtonComponent = { id: ComponentId; component: 'Button' } & ButtonProps;

export function Button<const Name extends string>(
  id: ComponentId,
  props: ButtonProps & Dispatches<Name>,
): ButtonComponent & Dispatches<Name> {
  return { id, component: 'Button', ...props };
}

export type TextFieldProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * A list of validation check rules to perform on the component.
   */
  '@checks'?: Array<CheckRule>;
  /**
   * The text label for the input field.
   */
  label: DynamicString;
  /**
   * The value of the text field. Always a string, under every variant: a 'number' field bound to '/importo' answers '84.50' and not 84.5.
   */
  value: DynamicString;
  /**
   * The type of input field to display. 'number' chooses the numeric keyboard and the characters the field accepts; it does not change the type of the value, which stays a string.
   * @default "shortText"
   */
  variant?: 'longText' | 'number' | 'shortText' | 'obscured';
  weight?: Weight;
};

export type TextFieldComponent = { id: ComponentId; component: 'TextField' } & TextFieldProps;

export function TextField(id: ComponentId, props: TextFieldProps): TextFieldComponent {
  return { id, component: 'TextField', ...props };
}

export type CheckBoxProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The text to display next to the checkbox.
   */
  label: DynamicString;
  /**
   * The current state of the checkbox (true for checked, false for unchecked).
   */
  value: DynamicBoolean;
  weight?: Weight;
};

export type CheckBoxComponent = { id: ComponentId; component: 'CheckBox' } & CheckBoxProps;

export function CheckBox(id: ComponentId, props: CheckBoxProps): CheckBoxComponent {
  return { id, component: 'CheckBox', ...props };
}

export type ChoicePickerProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The label for the group of options.
   */
  label?: DynamicString;
  /**
   * A hint for how the choice picker should be displayed and behave.
   * @default "mutuallyExclusive"
   */
  variant?: 'multipleSelection' | 'mutuallyExclusive';
  /**
   * The list of available options to choose from.
   */
  options: Array<{
    /**
     * The text to display for this option.
     */
    label: DynamicString;
    /**
     * The stable value associated with this option.
     */
    value: string;
  }>;
  /**
   * The list of currently selected values. This should be bound to a string array in the data model.
   */
  value: DynamicStringList;
  /**
   * How the options are laid out: checkbox stacks them as full-width rows, chips wraps them as compact pills. It does not decide the mark drawn beside an option — variant does.
   * @default "checkbox"
   */
  displayStyle?: 'checkbox' | 'chips';
  /**
   * If true, displays a search input to filter the options.
   * @default false
   */
  filterable?: boolean;
  weight?: Weight;
};

export type ChoicePickerComponent = {
  id: ComponentId;
  component: 'ChoicePicker';
} & ChoicePickerProps;

export function ChoicePicker(id: ComponentId, props: ChoicePickerProps): ChoicePickerComponent {
  return { id, component: 'ChoicePicker', ...props };
}

export type SliderProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The label for the slider.
   */
  label?: DynamicString;
  /**
   * The minimum value of the slider.
   * @default 0
   */
  min?: number;
  /**
   * The maximum value of the slider.
   */
  max: number;
  /**
   * The current value of the slider.
   */
  value: DynamicNumber;
  weight?: Weight;
};

export type SliderComponent = { id: ComponentId; component: 'Slider' } & SliderProps;

export function Slider(id: ComponentId, props: SliderProps): SliderComponent {
  return { id, component: 'Slider', ...props };
}

export type DateTimeInputProps = {
  /**
   * The catalog ID for this component, overriding any surface-level default catalogId.
   */
  '@catalogId'?: string;
  '@accessibility'?: AccessibilityAttributes;
  /**
   * Optional component-level metadata for vendor extensions.
   */
  '@metadata'?: {
    extensions?: Extensions;
  };
  /**
   * The selected date and/or time value in ISO 8601 format. If not yet set, initialize with an empty string.
   */
  value: DynamicString;
  /**
   * If true, allows the user to select a date.
   * @default false
   */
  enableDate?: boolean;
  /**
   * If true, allows the user to select a time.
   * @default false
   */
  enableTime?: boolean;
  /**
   * The minimum allowed date/time in ISO 8601 format.
   */
  min?: DynamicString;
  /**
   * The maximum allowed date/time in ISO 8601 format.
   */
  max?: DynamicString;
  /**
   * The text label for the input field.
   */
  label?: DynamicString;
  weight?: Weight;
};

export type DateTimeInputComponent = {
  id: ComponentId;
  component: 'DateTimeInput';
} & DateTimeInputProps;

export function DateTimeInput(id: ComponentId, props: DateTimeInputProps): DateTimeInputComponent {
  return { id, component: 'DateTimeInput', ...props };
}

/** The action name a component dispatches, kept literal so `ask()` can hold quickActions to it. */
export type Dispatches<Name extends string> = { action: { event: { name: Name } } };

export type Component =
  | TextComponent
  | ImageComponent
  | IconComponent
  | DividerComponent
  | RowComponent
  | ColumnComponent
  | ListComponent
  | CardComponent
  | ButtonComponent
  | TextFieldComponent
  | CheckBoxComponent
  | ChoicePickerComponent
  | SliderComponent
  | DateTimeInputComponent;

export type ComponentType = Component['component'];
