import "server-only";
import { z } from "zod";

// Shared by the registration form and the dashboard's "join a team" form —
// both let a player attach themselves to an alliance by giving its server
// number, its trigram, and their in-game account number, subject to that
// alliance's leadership accepting the request (see acceptJoinRequestAction
// in app/actions/team.ts).
export function joinTeamSchema(t: (key: string) => string) {
  return z.object({
    gameId: z
      .string()
      .trim()
      .regex(/^\d{3,15}$/, t("invalidGameId"))
      .transform((s) => BigInt(s)),
    serverNumber: z.string().trim().min(1, t("serverNumberRequired")).max(20),
    tag: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3}$/, t("invalidTag")),
  });
}
