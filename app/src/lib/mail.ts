import "server-only";

// No transactional email provider is configured yet. This stub keeps the
// call sites (password changes, etc.) working end-to-end during
// development — swap the body for a real provider (Resend, Postmark, SES,
// ...) when one is set up. Every call site stays the same.
export async function sendPasswordChangedEmail(to: string, playerName: string) {
  console.log(
    `[mail stub] Would notify ${playerName} <${to}> that their password was changed. ` +
      "No email provider is configured yet — wire one up in src/lib/mail.ts."
  );
}
