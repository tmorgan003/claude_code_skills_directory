import { StateMessage } from "@/components/StateMessage";

export default function NotFound() {
  return (
    <StateMessage variant="empty" title="Repo not found" description="It may have been removed or renamed." />
  );
}
