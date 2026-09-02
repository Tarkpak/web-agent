import type * as React from "react";
import { BotIcon, SettingsIcon } from "lucide-react";
import type { CatalogModel, ProviderSettings } from "@/lib/provider";
import { ProviderSettingsButton } from "@/components/provider-settings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  settings: ProviderSettings;
  models: CatalogModel[];
  onSaveSettings: (next: ProviderSettings) => void;
};

export function ThreadListSidebar({
  settings,
  models,
  onSaveSettings,
  ...props
}: ThreadListSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header border-b px-3 py-3">
        <div className="aui-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none px-1">
                <div className="aui-sidebar-header-icon-wrapper bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                  <BotIcon className="aui-sidebar-header-icon size-4" />
                </div>
                <div className="aui-sidebar-header-heading me-6 flex flex-col gap-0.5 leading-none">
                  <span className="aui-sidebar-header-title font-semibold">Agent Shell</span>
                  <span className="text-muted-foreground text-xs font-normal">Local workspace</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="aui-sidebar-content overflow-hidden px-2.5 py-2">
        <ThreadList />
      </SidebarContent>
      {props.collapsible !== "none" && <SidebarRail />}
      <SidebarFooter className="aui-sidebar-footer border-t p-2.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <ProviderSettingsButton
              settings={settings}
              models={models}
              onSave={onSaveSettings}
              trigger={
                <SidebarMenuButton size="lg" tooltip="Provider settings">
                  <div className="aui-sidebar-footer-icon-wrapper bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <SettingsIcon className="aui-sidebar-footer-icon size-4" />
                  </div>
                  <div className="aui-sidebar-footer-heading flex min-w-0 flex-col gap-0.5 leading-none">
                    <span className="aui-sidebar-footer-title font-semibold">Provider</span>
                    <span className="text-muted-foreground truncate text-xs font-normal">
                      {settings.provider === "xai" ? "xAI Grok" : "OpenAI compatible"}
                    </span>
                  </div>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
