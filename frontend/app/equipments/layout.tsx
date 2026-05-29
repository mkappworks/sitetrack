import { requireAuthedSession } from '../../lib/require-session';
import { NavSidebar } from '../../components/layout/NavSidebar';

export default async function EquipmentsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthedSession();

  return (
    <div className="flex h-screen bg-gray-50">
      <NavSidebar user={session.user} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
