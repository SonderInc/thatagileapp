import type { Team } from '../types';

/**
 * Returns the effective member IDs for a team. For a regular team, this is
 * team.memberIds. For a team-of-teams, it is the union of memberIds of all
 * child teams (teams whose id is in team.childTeamIds).
 */
export function getEffectiveMemberIds(team: Team, allTeams: Team[]): string[] {
  if (team.teamType !== 'team-of-teams' || !(team.childTeamIds?.length)) {
    return team.memberIds ?? [];
  }
  const ids: string[] = [];
  for (const childId of team.childTeamIds) {
    const child = allTeams.find((t) => t.id === childId);
    if (child?.memberIds?.length) ids.push(...child.memberIds);
  }
  return [...new Set(ids)];
}
