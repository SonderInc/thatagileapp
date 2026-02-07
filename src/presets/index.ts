import type { FrameworkSettings } from '../types/frameworkSettings';
import { validateFrameworkSettings } from '../utils/validateFrameworkSettings';

import safeJson from './safe.json';
import safeEssentialJson from './safe-essential.json';
import safeLargeSolutionJson from './safe-large-solution.json';
import safePortfolioJson from './safe-portfolio.json';
import safeFullJson from './safe-full.json';
import lessJson from './less.json';
import spotifyJson from './spotify.json';
import appleJson from './apple.json';
import dadJson from './dad.json';

export type PresetId =
  | 'safe'
  | 'safe-essential'
  | 'safe-large-solution'
  | 'safe-portfolio'
  | 'safe-full'
  | 'less'
  | 'spotify'
  | 'apple'
  | 'dad';

export const FRAMEWORK_PRESETS: { id: PresetId; name: string; description: string; settings: FrameworkSettings }[] = [
  { id: 'safe', name: 'SAFe', description: 'Scaled Agile Framework: Epic, Feature, User Story, Task, Bug.', settings: safeJson as FrameworkSettings },
  { id: 'safe-essential', name: 'SAFe — Essential', description: 'Essential SAFe: Company, Product, Epic, Feature, Story, Task, Bug.', settings: safeEssentialJson as FrameworkSettings },
  { id: 'safe-large-solution', name: 'SAFe — Large Solution', description: 'Large Solution SAFe: adds Solution and Capability.', settings: safeLargeSolutionJson as FrameworkSettings },
  { id: 'safe-portfolio', name: 'SAFe — Portfolio', description: 'Portfolio SAFe: adds Strategic Theme and Initiative.', settings: safePortfolioJson as FrameworkSettings },
  { id: 'safe-full', name: 'SAFe — Full', description: 'Full SAFe: Strategic Theme, Initiative, Solution, Capability, Epic, Feature, Story, Task, Bug.', settings: safeFullJson as FrameworkSettings },
  { id: 'less', name: 'LeSS', description: 'Large-Scale Scrum: Feature, Story, Task, Bug (no Epic).', settings: lessJson as FrameworkSettings },
  { id: 'spotify', name: 'Spotify', description: 'Squad/tribe style: Feature, Story, Task, Bug.', settings: spotifyJson as FrameworkSettings },
  { id: 'apple', name: 'Apple', description: 'Initiative, Project, Story, Task, Bug.', settings: appleJson as FrameworkSettings },
  { id: 'dad', name: 'Disciplined Agile (DaD)', description: 'Lean: Feature, Story, Task, Bug.', settings: dadJson as FrameworkSettings },
];

function validatePresets(): void {
  for (const preset of FRAMEWORK_PRESETS) {
    const result = validateFrameworkSettings(preset.settings);
    if (!result.ok) {
      console.error(`[presets] Invalid preset ${preset.id}:`, result.errors);
      throw new Error(`Invalid preset ${preset.id}: ${result.errors.join('; ')}`);
    }
  }
}

validatePresets();

export function getPresetById(id: PresetId): FrameworkSettings {
  const preset = FRAMEWORK_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset.settings;
}
