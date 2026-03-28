import { useEffect } from "react";
import { useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { ChatLayout } from "@/components/chat/ChatLayout";

export function Chat() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Chat" }]);
  }, [setBreadcrumbs]);

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select a company to start chatting.
      </div>
    );
  }

  return <ChatLayout companyId={selectedCompanyId} threadId={threadId} />;
}
