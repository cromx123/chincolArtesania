import type { AssistantTask } from "@/domain/assistant";
import { CameraIcon, PencilIcon, StarIcon, WhatsappIcon } from "../../icons";

export function TaskIcon({ task, size = 22 }: { task: AssistantTask; size?: number }) {
  switch (task) {
    case "publicacion":
      return <CameraIcon size={size} />;
    case "feria":
      return <StarIcon size={size} />;
    case "respuesta":
      return <WhatsappIcon size={size} />;
    case "descripcion":
      return <PencilIcon size={size} />;
  }
}
