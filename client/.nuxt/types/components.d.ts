
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

interface _GlobalComponents {
  'AnnouncementView': typeof import("../../components/AnnouncementView.vue")['default']
  'CacheDebugger': typeof import("../../components/CacheDebugger.vue")['default']
  'DeleteAnnouncements': typeof import("../../components/DeleteAnnouncements.vue")['default']
  'DeleteMembers': typeof import("../../components/DeleteMembers.vue")['default']
  'DeleteTeams': typeof import("../../components/DeleteTeams.vue")['default']
  'GlobalNotifications': typeof import("../../components/GlobalNotifications.vue")['default']
  'NewAnnouncements': typeof import("../../components/NewAnnouncements.vue")['default']
  'NewMembers': typeof import("../../components/NewMembers.vue")['default']
  'NewTasks': typeof import("../../components/NewTasks.vue")['default']
  'NewTeams': typeof import("../../components/NewTeams.vue")['default']
  'NotificationCenter': typeof import("../../components/NotificationCenter.vue")['default']
  'RoleManagement': typeof import("../../components/RoleManagement.vue")['default']
  'RoleManagementTabs': typeof import("../../components/RoleManagementTabs.vue")['default']
  'SessionManager': typeof import("../../components/SessionManager.vue")['default']
  'Sidebar': typeof import("../../components/Sidebar.vue")['default']
  'TMFooter': typeof import("../../components/TMFooter.vue")['default']
  'TaskSubmission': typeof import("../../components/TaskSubmission.vue")['default']
  'UpdateAnnouncements': typeof import("../../components/UpdateAnnouncements.vue")['default']
  'UpdateManagement': typeof import("../../components/UpdateManagement.vue")['default']
  'UpdateTaskGroups': typeof import("../../components/UpdateTaskGroups.vue")['default']
  'ViewTask': typeof import("../../components/ViewTask.vue")['default']
  'WorkflowView': typeof import("../../components/WorkflowView.vue")['default']
  'VIconLogin': typeof import("../../components/vIconLogin.vue")['default']
  'NuxtWelcome': typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  'NuxtLayout': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  'NuxtErrorBoundary': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  'ClientOnly': typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  'DevOnly': typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  'ServerPlaceholder': typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  'NuxtLink': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  'NuxtLoadingIndicator': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  'NuxtTime': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  'NuxtRouteAnnouncer': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  'NuxtImg': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  'NuxtPicture': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  'NuxtPage': typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  'NoScript': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  'Link': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  'Base': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  'Title': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  'Meta': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  'Style': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  'Head': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  'Html': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  'Body': typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  'NuxtIsland': typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  'LazyAnnouncementView': LazyComponent<typeof import("../../components/AnnouncementView.vue")['default']>
  'LazyCacheDebugger': LazyComponent<typeof import("../../components/CacheDebugger.vue")['default']>
  'LazyDeleteAnnouncements': LazyComponent<typeof import("../../components/DeleteAnnouncements.vue")['default']>
  'LazyDeleteMembers': LazyComponent<typeof import("../../components/DeleteMembers.vue")['default']>
  'LazyDeleteTeams': LazyComponent<typeof import("../../components/DeleteTeams.vue")['default']>
  'LazyGlobalNotifications': LazyComponent<typeof import("../../components/GlobalNotifications.vue")['default']>
  'LazyNewAnnouncements': LazyComponent<typeof import("../../components/NewAnnouncements.vue")['default']>
  'LazyNewMembers': LazyComponent<typeof import("../../components/NewMembers.vue")['default']>
  'LazyNewTasks': LazyComponent<typeof import("../../components/NewTasks.vue")['default']>
  'LazyNewTeams': LazyComponent<typeof import("../../components/NewTeams.vue")['default']>
  'LazyNotificationCenter': LazyComponent<typeof import("../../components/NotificationCenter.vue")['default']>
  'LazyRoleManagement': LazyComponent<typeof import("../../components/RoleManagement.vue")['default']>
  'LazyRoleManagementTabs': LazyComponent<typeof import("../../components/RoleManagementTabs.vue")['default']>
  'LazySessionManager': LazyComponent<typeof import("../../components/SessionManager.vue")['default']>
  'LazySidebar': LazyComponent<typeof import("../../components/Sidebar.vue")['default']>
  'LazyTMFooter': LazyComponent<typeof import("../../components/TMFooter.vue")['default']>
  'LazyTaskSubmission': LazyComponent<typeof import("../../components/TaskSubmission.vue")['default']>
  'LazyUpdateAnnouncements': LazyComponent<typeof import("../../components/UpdateAnnouncements.vue")['default']>
  'LazyUpdateManagement': LazyComponent<typeof import("../../components/UpdateManagement.vue")['default']>
  'LazyUpdateTaskGroups': LazyComponent<typeof import("../../components/UpdateTaskGroups.vue")['default']>
  'LazyViewTask': LazyComponent<typeof import("../../components/ViewTask.vue")['default']>
  'LazyWorkflowView': LazyComponent<typeof import("../../components/WorkflowView.vue")['default']>
  'LazyVIconLogin': LazyComponent<typeof import("../../components/vIconLogin.vue")['default']>
  'LazyNuxtWelcome': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  'LazyNuxtLayout': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  'LazyNuxtErrorBoundary': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  'LazyClientOnly': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  'LazyDevOnly': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  'LazyServerPlaceholder': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  'LazyNuxtLink': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  'LazyNuxtLoadingIndicator': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  'LazyNuxtTime': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  'LazyNuxtRouteAnnouncer': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  'LazyNuxtImg': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  'LazyNuxtPicture': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  'LazyNuxtPage': LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  'LazyNoScript': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  'LazyLink': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  'LazyBase': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  'LazyTitle': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  'LazyMeta': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  'LazyStyle': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  'LazyHead': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  'LazyHtml': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  'LazyBody': LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  'LazyNuxtIsland': LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
