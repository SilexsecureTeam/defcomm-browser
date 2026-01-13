import { createRoot } from "react-dom/client";
import { useTauriUpdater } from "./hooks/useTauriUpdater";
import DefcommHUDUpdate from "./components/UpdateModal";

function UpdateWebview() {
  const { update } = useTauriUpdater();

  if (!update) return null;

  return (
    <DefcommHUDUpdate
      update={update}
      required
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<UpdateWebview />);
