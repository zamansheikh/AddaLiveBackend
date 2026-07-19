import bcrypt from "bcrypt";
import Admin from "../../models/admin/admin_model";
import { UserRoles } from "../Utils/enums";

/**
 * Ensure the portal owner — the single `super-admin` — exists.
 *
 * This is SEPARATE from the "app super admin" (role `admin`): it lives in the
 * same admins collection and uses the same /api/admin/login, but has role
 * `super-admin`, the top-power role that bypasses every backend role check and
 * is the only role allowed into the portal owner areas (Agora console, Owner
 * Account settings).
 *
 * Credentials come from env:
 *   SUPER_ADMIN_USERNAME (default "superadmin" — "admin" is the app super admin)
 *   SUPER_ADMIN_PASSWORD (default "12345")
 *   SUPER_ADMIN_EMAIL
 *
 * Behaviour (only ever touches the `super-admin` record — never the app admin):
 *  - No super-admin yet → create one from env.
 *  - Super-admin exists → leave it alone, so changes made from the admin panel
 *    (Settings → Owner Account) survive restarts.
 *  - SUPER_ADMIN_FORCE_RESET=true → reset the super-admin's username/password/
 *    email back to env (recover a locked-out owner), then set the flag off.
 */
export async function seedSuperAdmin(): Promise<void> {
  const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
  const password = process.env.SUPER_ADMIN_PASSWORD || "12345";
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@addavoicerom.com";
  const forceReset = process.env.SUPER_ADMIN_FORCE_RESET === "true";

  const existing = await Admin.findOne({ userRole: UserRoles.SuperAdmin });

  if (existing && !forceReset) return; // owner set up — leave credentials alone

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    // One-time recovery: reset the owner's login to the env credentials.
    existing.username = username;
    existing.password = hashedPassword;
    existing.email = email;
    existing.userRole = UserRoles.SuperAdmin;
    await existing.save();
    console.log(
      `♻️  Reset super-admin owner to "${username}" from env (SUPER_ADMIN_FORCE_RESET=true). Turn the flag back off now.`,
    );
    return;
  }

  await Admin.create({
    username,
    password: hashedPassword,
    email,
    userRole: UserRoles.SuperAdmin,
  });
  console.log(`✅ Seeded super-admin owner "${username}" (role super-admin)`);
}
