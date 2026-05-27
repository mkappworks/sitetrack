"use client";

import { useActionState } from "react";
import {
  createUser,
  type CreateUserState,
} from "../../../lib/actions/user.actions";

const initialState: CreateUserState = {};

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(
    createUser,
    initialState,
  );

  return (
    <form action={formAction} className="card max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Create user</h1>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {state.error}
        </p>
      )}

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

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
