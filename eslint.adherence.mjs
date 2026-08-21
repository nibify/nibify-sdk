// Generated from packages/ui/**/*.d.ts by scripts/build-adherence.mjs — not edited
// by hand: run `pnpm adherence` and commit the diff. Every prop of @nibify/ui is
// written in the .jsx that implements it and the .d.ts that declares it; this file
// is the same fact projected onto the callers, and projecting it is why it cannot
// fall behind (#76).
//
// It is copied into nibify/nibify-sdk alongside eslint.config.mjs, which imports
// it. There these selectors match nothing — that repository has no @nibify/ui —
// and that is the deal the README already describes for a config that is copied
// rather than published.

export const COMPONENT_ADHERENCE = [
  {
    selector:
      "JSXOpeningElement[name.name='Avatar'] > JSXAttribute > JSXIdentifier[name!=/^(?:initials|tone|size|key|ref|className|style|children)$/]",
    message: "<Avatar> doesn't accept that prop. Declared props: initials, tone, size.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Avatar'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:quiet|ink|accent)$/]",
    message: "<Avatar> tone must be one of 'quiet' | 'ink' | 'accent'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute > JSXIdentifier[name!=/^(?:variant|platform|block|disabled|loading|children|onClick|type|key|ref|className|style)$/]",
    message:
      "<Button> doesn't accept that prop. Declared props: variant, platform, block, disabled, loading, children, onClick, type.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|secondary|ghost|inverse)$/]",
    message: "<Button> variant must be one of 'primary' | 'secondary' | 'ghost' | 'inverse'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='platform'] > Literal[value!=/^(?:mobile|web)$/]",
    message: "<Button> platform must be one of 'mobile' | 'web'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:button|submit)$/]",
    message: "<Button> type must be one of 'button' | 'submit'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatBubble'] > JSXAttribute > JSXIdentifier[name!=/^(?:from|children|meta|key|ref|className|style)$/]",
    message: "<ChatBubble> doesn't accept that prop. Declared props: from, children, meta.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatBubble'] > JSXAttribute[name.name='from'] > Literal[value!=/^(?:agent|user)$/]",
    message: "<ChatBubble> from must be one of 'agent' | 'user'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatComposer'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|placeholder|onChange|onSend|key|ref|className|style|children)$/]",
    message:
      "<ChatComposer> doesn't accept that prop. Declared props: value, placeholder, onChange, onSend.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='CodeBlock'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|tabs|activeTab|footer|onTab|key|ref|className|style)$/]",
    message:
      "<CodeBlock> doesn't accept that prop. Declared props: children, tabs, activeTab, footer, onTab.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='DeliveryChip'] > JSXAttribute > JSXIdentifier[name!=/^(?:step|key|ref|className|style|children)$/]",
    message: "<DeliveryChip> doesn't accept that prop. Declared props: step.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='DeliveryChip'] > JSXAttribute[name.name='step'] > Literal[value!=/^(?:sent|delivered|read|answered)$/]",
    message: "<DeliveryChip> step must be one of 'sent' | 'delivered' | 'read' | 'answered'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='EmptyState'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|hint|key|ref|className|style|children)$/]",
    message: "<EmptyState> doesn't accept that prop. Declared props: label, hint.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='FilterChip'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|active|onClick|key|ref|className|style|children)$/]",
    message: "<FilterChip> doesn't accept that prop. Declared props: label, active, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='IconButton'] > JSXAttribute > JSXIdentifier[name!=/^(?:variant|size|ariaLabel|children|onClick|key|ref|className|style)$/]",
    message:
      "<IconButton> doesn't accept that prop. Declared props: variant, size, ariaLabel, children, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='IconButton'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|secondary)$/]",
    message: "<IconButton> variant must be one of 'primary' | 'secondary'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='InboxRow'] > JSXAttribute > JSXIdentifier[name!=/^(?:agent|time|message|state|tone|href|onClick|key|ref|className|style|children)$/]",
    message:
      "<InboxRow> doesn't accept that prop. Declared props: agent, time, message, state, tone, href, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='InboxRow'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:open|ageing|closed|expired)$/]",
    message: "<InboxRow> tone must be one of 'open' | 'ageing' | 'closed' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Lockup'] > JSXAttribute > JSXIdentifier[name!=/^(?:size|tone|key|ref|className|style|children)$/]",
    message: "<Lockup> doesn't accept that prop. Declared props: size, tone.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Lockup'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark)$/]",
    message: "<Lockup> tone must be one of 'light' | 'dark'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute > JSXIdentifier[name!=/^(?:size|tone|ball|pulse|title|key|ref|className|style|children)$/]",
    message: "<Mark> doesn't accept that prop. Declared props: size, tone, ball, pulse, title.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark|mono)$/]",
    message: "<Mark> tone must be one of 'light' | 'dark' | 'mono'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute[name.name='ball'] > Literal[value!=/^(?:center|sent|reply|answered|expired)$/]",
    message: "<Mark> ball must be one of 'center' | 'sent' | 'reply' | 'answered' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='MetricCard'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|note|tone|key|ref|className|style|children)$/]",
    message: "<MetricCard> doesn't accept that prop. Declared props: label, value, note, tone.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='MetricCard'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:neutral|accent|ageing)$/]",
    message: "<MetricCard> tone must be one of 'neutral' | 'accent' | 'ageing'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='PongLoader'] > JSXAttribute > JSXIdentifier[name!=/^(?:width|tone|label|key|ref|className|style|children)$/]",
    message: "<PongLoader> doesn't accept that prop. Declared props: width, tone, label.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='PongLoader'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:dark|light)$/]",
    message: "<PongLoader> tone must be one of 'dark' | 'light'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='QuickReply'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|tone|onClick|key|ref|className|style|children)$/]",
    message: "<QuickReply> doesn't accept that prop. Declared props: label, tone, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='QuickReply'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:suggested|neutral)$/]",
    message: "<QuickReply> tone must be one of 'suggested' | 'neutral'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RadioGroup'] > JSXAttribute > JSXIdentifier[name!=/^(?:name|legend|value|onChange|children|key|ref|className|style)$/]",
    message:
      "<RadioGroup> doesn't accept that prop. Declared props: name, legend, value, onChange, children.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RadioOption'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|selected|onSelect|key|ref|className|style|children)$/]",
    message:
      "<RadioOption> doesn't accept that prop. Declared props: label, value, selected, onSelect.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RequestCard'] > JSXAttribute > JSXIdentifier[name!=/^(?:agent|time|state|question|footer|open|children|key|ref|className|style)$/]",
    message:
      "<RequestCard> doesn't accept that prop. Declared props: agent, time, state, question, footer, open, children.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RequestCard'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:waiting|ageing|answered|expired|read|delivered|sent)$/]",
    message:
      "<RequestCard> state must be one of 'waiting' | 'ageing' | 'answered' | 'expired' | 'read' | 'delivered' | 'sent'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='SegmentedControl'] > JSXAttribute > JSXIdentifier[name!=/^(?:options|value|onChange|key|ref|className|style|children)$/]",
    message:
      "<SegmentedControl> doesn't accept that prop. Declared props: options, value, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='SidebarItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|badge|active|href|onClick|key|ref|className|style|children)$/]",
    message:
      "<SidebarItem> doesn't accept that prop. Declared props: label, badge, active, href, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute > JSXIdentifier[name!=/^(?:state|label|size|key|ref|className|style|children)$/]",
    message: "<StateBadge> doesn't accept that prop. Declared props: state, label, size.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:sent|delivered|read|waiting|ageing|answered|expired)$/]",
    message:
      "<StateBadge> state must be one of 'sent' | 'delivered' | 'read' | 'waiting' | 'ageing' | 'answered' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:s|m)$/]",
    message: "<StateBadge> size must be one of 's' | 'm'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Switch'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|checked|onChange|key|ref|className|style|children)$/]",
    message: "<Switch> doesn't accept that prop. Declared props: label, checked, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Textarea'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|placeholder|rows|onChange|key|ref|className|style|children)$/]",
    message:
      "<Textarea> doesn't accept that prop. Declared props: label, value, placeholder, rows, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|placeholder|prefix|suffix|mono|state|hint|type|autoComplete|onChange|key|ref|className|style|children)$/]",
    message:
      "<TextField> doesn't accept that prop. Declared props: label, value, placeholder, prefix, suffix, mono, state, hint, type, autoComplete, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:default|active|error)$/]",
    message: "<TextField> state must be one of 'default' | 'active' | 'error'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:text|email|tel|url|number|password)$/]",
    message:
      "<TextField> type must be one of 'text' | 'email' | 'tel' | 'url' | 'number' | 'password'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TimelineItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|time|tone|last|key|ref|className|style|children)$/]",
    message: "<TimelineItem> doesn't accept that prop. Declared props: label, time, tone, last.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TimelineItem'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:quiet|strong|answered|accent)$/]",
    message: "<TimelineItem> tone must be one of 'quiet' | 'strong' | 'answered' | 'accent'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TypingIndicator'] > JSXAttribute > JSXIdentifier[name!=/^(?:key|ref|className|style|children)$/]",
    message: "<TypingIndicator> doesn't accept that prop: it declares none.",
  },
];
