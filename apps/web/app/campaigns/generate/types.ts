export type WizardStep = 'template' | 'data-source' | 'rules' | 'preview';

export interface WizardState {
  currentStep: WizardStep;
  templateId: string | null;
  dataSourceId: string | null;
  ruleIds: string[];
}

export const WIZARD_STEPS: WizardStep[] = ['template', 'data-source', 'rules', 'preview'];

export const STEP_LABELS: Record<WizardStep, string> = {
  'template': 'Select Template',
  'data-source': 'Select Data Source',
  'rules': 'Configure Rules',
  'preview': 'Preview & Generate',
};
