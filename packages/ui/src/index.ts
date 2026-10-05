export { Button, type ButtonProps } from './button';
export { buttonVariants, focusRing, pressable, fieldControl } from './button-styles'; // D-535: lets optimizePackageImports skip button.tsx
export * from './morph';
export * from './icon-button';
export * from './input';
export * from './textarea';
export * from './checkbox';
export * from './switch';
export * from './segmented';
export * from './tag';
export * from './pill';
export * from './card';
export * from './progress';
export * from './dialog';
export * from './toast';
export * from './avatar';
export * from './eyebrow';
export * from './logo';
export * from './alert';
export * from './skeleton';
export * from './spinner';
export * from './separator';
export * from './kbd';
export * from './stat';
export * from './chart';
export * from './empty';
export * from './breadcrumb';
export * from './rating';
export * from './tooltip';
export * from './challenge-tour';
export * from './tabs';
export * from './accordion';
export * from './select';
export * from './radio-group';
export * from './menu';
export type { Tone } from './tone';
export * from './state-pill';
export * from './state-bar';
export * from './graph-preview';
export * from './inline-title';
export { mapStateOrder, type MapState } from './state';
export * from './icons';
export * from './app-rail';
export * from './ring';
export * from './hero';
export * from './constellation';
export * from './map-tile';
export * from './filter-chip';
export * from './view-toggle';
export * from './stepper';
export * from './choice-card';
export * from './dropzone';
// Canvas v2 (G01 T2). Per-file (D-535): `optimizePackageImports` stops at a sub-barrel, so `from './canvas'` made the
// landing ship every canvas component (Dialog, Tooltip, Popper...) for the 4 its hero uses.
export { NodeCard, nodeSize, NODE_SIZE, FRONT_IMAGE_EXTRA, shapeAnchor, type CardShape, type NodeCardProps, type NodeType, type NodeLayer, type NodeChallengeRole, type NodeChip, type NodeStep, type NodeImage, type CaseStage, StepTimeline, CaseStageList } from './canvas/node-card';
export { route, routePoints, anchor, MAX_RADIUS, type Side, type Rect, type Point, type Route } from './canvas/route';
export { EdgeLabel, type EdgeLabelProps } from './canvas/edge-label';
export { LayerSwitch, type LayerSwitchProps } from './canvas/layer-switch';
export { Legend, type LegendProps } from './canvas/legend';
export { CanvasToolbar, type CanvasToolbarProps, type ToolbarItem } from './canvas/canvas-toolbar';
export { ZoomControl, type ZoomControlProps, stepZoom, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './canvas/zoom-control';
export { InspectorTabs, InspectorTabPanel, type InspectorTabsProps } from './canvas/inspector-tabs';
export { RubricList, type RubricListProps } from './canvas/rubric-list';
export { QuestionPanel, type QuestionPanelProps, type AnswerMode } from './canvas/question-panel';
export { VerdictBox, type VerdictBoxProps } from './canvas/verdict-box';
export { RatingButton, RatingGroup, type RatingButtonProps } from './canvas/rating-button';
export { CanvasPanel } from './canvas/canvas-panel';
export { CommandPalette, type CommandPaletteProps, type CommandItem } from './canvas/command-palette';
// Conta (F13).
export * from './account';
// Navbar e carrossel (F14).
export * from './shell';
export * from './home';
export * from './plans';
export * from './marketing';
// F17 — componentes novos (Combobox, CopyField, PasswordInput).
export * from './combobox';
export * from './copy-field';
export * from './password-input';
// F18 Indicação.
export * from './referral';
// F19 Suporte e painel admin (admin/admin-shell.tsx).
export * from './support';
export * from './admin';
// F20 Loja de mapas (Fase A, Em breve).
export * from './store';
export * from './charts';
export * from './sheet';
// F23 Mapa no celular: aside (MapAside, ProgressSummary, ToggleRow, NavRow).
export * from './aside';
// F23 Mapa no celular: cabeçalho em pílula, IconPill e barra flutuante (map-mobile).
export * from './map-mobile';
// F25 Calendário.
export * from './calendar';
// F26 Central de notificações (sino, popover, item, preferências).
export * from './notifications';
