import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import { gqlClient } from '../../lib/graphql/client';
import { USERS_QUERY } from '../../lib/graphql/queries';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Double-check role on the server — middleware handles redirects,
  // but this is the authoritative guard for this page's data
  if (session?.user.role !== 'ADMIN') redirect('/dashboard');

  const client = await gqlClient();
  const data = await client.request<{ users: any[] }>(USERS_QUERY);
  const users = data.users;

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    VIEWER: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users and system settings</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-900">Users ({users.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Role</th>
                <th className="text-left py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{user.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{user.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-md ${roleColors[user.role] ?? 'bg-gray-100'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
