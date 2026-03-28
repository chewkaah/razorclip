import { useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { listUIAdapters } from "@/adapters/registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatAdapterSelectorProps {
  threadId: string;
  adapterType: string;
  model: string | null;
  companyId: string;
}

const adapters = listUIAdapters().filter((a) => a.label);

export function ChatAdapterSelector({
  threadId,
  adapterType,
  companyId,
}: ChatAdapterSelectorProps) {
  const queryClient = useQueryClient();

  const handleChange = async (newType: string) => {
    await chatApi.updateThread(threadId, { adapterType: newType });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.thread(threadId) });
  };

  return (
    <Select value={adapterType} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {adapters.map((a) => (
          <SelectItem key={a.type} value={a.type} className="text-xs">
            {a.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
