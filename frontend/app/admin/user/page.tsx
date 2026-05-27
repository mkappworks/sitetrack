import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { CreateUserForm } from "./CreateUserForm";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  return <CreateUserForm />;
}
