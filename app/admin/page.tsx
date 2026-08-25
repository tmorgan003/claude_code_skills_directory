export const dynamic = "force-dynamic";

import { AdminQueue } from "@/components/AdminQueue";

export default function AdminPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-black tracking-tight">Admin Review Queue</h1>
      <p className="mb-6 text-sm text-gray-500">Reclassify unclassified repos and manage hidden entries.</p>
      <AdminQueue />
    </div>
  );
}
