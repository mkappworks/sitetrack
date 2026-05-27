import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { createUser } from "../../../lib/actions/user.actions";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <form action={createUser} className="card max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Create user</h1>

      <label className="block">
        <span className="text-sm">Name</span>
        <input name="name" required minLength={2} className="input" />
      </label>

      <label className="block">
        <span className="text-sm">Email</span>
        <input name="email" type="email" required className="input" />
      </label>

      <label className="block">
        <span className="text-sm">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </label>

      <label className="block">
        <span className="text-sm">Role</span>
        <select name="role" defaultValue="VIEWER" className="input">
          <option value="MANAGER">Manager</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </label>

      <button type="submit" className="btn-primary">
        Create user
      </button>
    </form>
  );
}
