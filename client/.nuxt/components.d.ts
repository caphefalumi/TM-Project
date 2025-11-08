
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const AnnouncementView: typeof import("../components/AnnouncementView.vue")['default']
export const CacheDebugger: typeof import("../components/CacheDebugger.vue")['default']
export const DeleteAnnouncements: typeof import("../components/DeleteAnnouncements.vue")['default']
export const DeleteMembers: typeof import("../components/DeleteMembers.vue")['default']
export const DeleteTeams: typeof import("../components/DeleteTeams.vue")['default']
export const GlobalNotifications: typeof import("../components/GlobalNotifications.vue")['default']
export const NewAnnouncements: typeof import("../components/NewAnnouncements.vue")['default']
export const NewMembers: typeof import("../components/NewMembers.vue")['default']
export const NewTasks: typeof import("../components/NewTasks.vue")['default']
export const NewTeams: typeof import("../components/NewTeams.vue")['default']
export const NotificationCenter: typeof import("../components/NotificationCenter.vue")['default']
export const RoleManagement: typeof import("../components/RoleManagement.vue")['default']
export const RoleManagementTabs: typeof import("../components/RoleManagementTabs.vue")['default']
export const SessionManager: typeof import("../components/SessionManager.vue")['default']
export const Sidebar: typeof import("../components/Sidebar.vue")['default']
export const TMFooter: typeof import("../components/TMFooter.vue")['default']
export const TaskSubmission: typeof import("../components/TaskSubmission.vue")['default']
export const UpdateAnnouncements: typeof import("../components/UpdateAnnouncements.vue")['default']
export const UpdateManagement: typeof import("../components/UpdateManagement.vue")['default']
export const UpdateTaskGroups: typeof import("../components/UpdateTaskGroups.vue")['default']
export const ViewTask: typeof import("../components/ViewTask.vue")['default']
export const WorkflowView: typeof import("../components/WorkflowView.vue")['default']
export const VIconLogin: typeof import("../components/vIconLogin.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyAnnouncementView: LazyComponent<typeof import("../components/AnnouncementView.vue")['default']>
export const LazyCacheDebugger: LazyComponent<typeof import("../components/CacheDebugger.vue")['default']>
export const LazyDeleteAnnouncements: LazyComponent<typeof import("../components/DeleteAnnouncements.vue")['default']>
export const LazyDeleteMembers: LazyComponent<typeof import("../components/DeleteMembers.vue")['default']>
export const LazyDeleteTeams: LazyComponent<typeof import("../components/DeleteTeams.vue")['default']>
export const LazyGlobalNotifications: LazyComponent<typeof import("../components/GlobalNotifications.vue")['default']>
export const LazyNewAnnouncements: LazyComponent<typeof import("../components/NewAnnouncements.vue")['default']>
export const LazyNewMembers: LazyComponent<typeof import("../components/NewMembers.vue")['default']>
export const LazyNewTasks: LazyComponent<typeof import("../components/NewTasks.vue")['default']>
export const LazyNewTeams: LazyComponent<typeof import("../components/NewTeams.vue")['default']>
export const LazyNotificationCenter: LazyComponent<typeof import("../components/NotificationCenter.vue")['default']>
export const LazyRoleManagement: LazyComponent<typeof import("../components/RoleManagement.vue")['default']>
export const LazyRoleManagementTabs: LazyComponent<typeof import("../components/RoleManagementTabs.vue")['default']>
export const LazySessionManager: LazyComponent<typeof import("../components/SessionManager.vue")['default']>
export const LazySidebar: LazyComponent<typeof import("../components/Sidebar.vue")['default']>
export const LazyTMFooter: LazyComponent<typeof import("../components/TMFooter.vue")['default']>
export const LazyTaskSubmission: LazyComponent<typeof import("../components/TaskSubmission.vue")['default']>
export const LazyUpdateAnnouncements: LazyComponent<typeof import("../components/UpdateAnnouncements.vue")['default']>
export const LazyUpdateManagement: LazyComponent<typeof import("../components/UpdateManagement.vue")['default']>
export const LazyUpdateTaskGroups: LazyComponent<typeof import("../components/UpdateTaskGroups.vue")['default']>
export const LazyViewTask: LazyComponent<typeof import("../components/ViewTask.vue")['default']>
export const LazyWorkflowView: LazyComponent<typeof import("../components/WorkflowView.vue")['default']>
export const LazyVIconLogin: LazyComponent<typeof import("../components/vIconLogin.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
