"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { gqlClient } from "../graphql/client";
import { CREATE_USER_MUTATION } from "../graphql/queries";

const ASSIGNABLE_ROLES = ["MANAGER", "VIEWER"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export async function createUser(formData: FormData) {
  // Server actions are publicly callable RPC endpoints. Re-verify the caller
  // is an admin before doing anything — the page-level guard doesn't apply here.
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  // Allowlist the role at the boundary. The backend also rejects ADMIN via
  // @IsIn(ASSIGNABLE_ROLES) on the DTO, but failing here is faster and clearer.
  const role = formData.get("role");
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    throw new Error("Invalid role");
  }

  const client = await gqlClient();

  await client.request(CREATE_USER_MUTATION, {
    input: {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      password: formData.get("password") as string,
      role,
    },
  });

  revalidatePath("/admin");
  redirect("/admin");
}
