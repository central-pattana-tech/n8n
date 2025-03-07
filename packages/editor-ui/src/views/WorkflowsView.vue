<template>
	<resources-list-layout
		ref="layout"
		resource-key="workflows"
		:resources="allWorkflows"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:show-aside="allWorkflows.length > 0"
		:shareable="false"
		@click:add="addWorkflow"
		@update:filters="filters = $event"
	>
		<template v-slot="{ data }">
			<workflow-card :data="data" @click:tag="onClickTag" />
		</template>
		<template #empty>
			<div class="text-center mt-s">
				<n8n-heading tag="h2" size="xlarge" class="mb-2xs">
					{{ $locale.baseText(currentUser.firstName ? 'workflows.empty.heading' : 'workflows.empty.heading.userNotSetup', { interpolate: { name: currentUser.firstName } }) }}
				</n8n-heading>
				<n8n-text size="large" color="text-base">
					{{ $locale.baseText('workflows.empty.description') }}
				</n8n-text>
			</div>
			<div class="text-center mt-2xl">
				<n8n-card :class="[$style.emptyStateCard, 'mr-s']" hoverable @click="addWorkflow">
					<n8n-icon :class="$style.emptyStateCardIcon" icon="file" />
					<n8n-text size="large" class="mt-xs" color="text-base">
						{{ $locale.baseText('workflows.empty.startFromScratch') }}
					</n8n-text>
				</n8n-card>
				<n8n-card :class="$style.emptyStateCard" hoverable @click="goToTemplates">
					<n8n-icon :class="$style.emptyStateCardIcon" icon="box-open" />
					<n8n-text size="large" class="mt-xs" color="text-base">
						{{ $locale.baseText('workflows.empty.browseTemplates') }}
					</n8n-text>
				</n8n-card>
			</div>
		</template>
		<template v-slot:filters="{ setKeyValue }">
			<div class="mb-s" v-if="settingsStore.areTagsEnabled">
				<n8n-input-label
					:label="$locale.baseText('workflows.filters.tags')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<TagsDropdown
					:placeholder="$locale.baseText('workflowOpen.filterWorkflows')"
					:currentTagIds="filters.tags"
					:createEnabled="false"
					@update="setKeyValue('tags', $event)"
				/>
			</div>
		</template>
	</resources-list-layout>
</template>

<script lang="ts">
import {showMessage} from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import ResourcesListLayout from "@/components/layouts/ResourcesListLayout.vue";
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import PageViewLayoutList from "@/components/layouts/PageViewLayoutList.vue";
import WorkflowCard from "@/components/WorkflowCard.vue";
import TemplateCard from "@/components/TemplateCard.vue";
import { debounceHelper } from '@/components/mixins/debounce';
import {VIEWS} from '@/constants';
import Vue from "vue";
import {ITag, IUser, IWorkflowDb} from "@/Interface";
import TagsDropdown from "@/components/TagsDropdown.vue";
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';

type IResourcesListLayoutInstance = Vue & { sendFiltersTelemetry: (source: string) => void };

export default mixins(
	showMessage,
	debounceHelper,
).extend({
	name: 'SettingsPersonalView',
	components: {
		ResourcesListLayout,
		TemplateCard,
		PageViewLayout,
		PageViewLayoutList,
		SettingsView,
		WorkflowCard,
		TagsDropdown,
	},
	data() {
		return {
			filters: {
				search: '',
				ownedBy: '',
				sharedWith: '',
				tags: [] as string[],
			},
		};
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
		),
		currentUser(): IUser {
			return this.usersStore.currentUser || {} as IUser;
		},
		allWorkflows(): IWorkflowDb[] {
			return this.workflowsStore.allWorkflows;
		},
	},
	methods: {
		addWorkflow() {
			this.uiStore.nodeViewInitialized = false;
			this.$router.push({ name: VIEWS.NEW_WORKFLOW });

			this.$telemetry.track('User clicked add workflow button', {
				source: 'Workflows list',
			});
		},
		goToTemplates() {
			this.$router.push({ name: VIEWS.TEMPLATES });
		},
		async initialize() {
			this.usersStore.fetchUsers(); // Can be loaded in the background, used for filtering

			return await Promise.all([
				this.workflowsStore.fetchAllWorkflows(),
				this.workflowsStore.fetchActiveWorkflows(),
			]);
		},
		onClickTag(tagId: string, event: PointerEvent) {
			if (!this.filters.tags.includes(tagId)) {
				this.filters.tags.push(tagId);
			}
		},
		onFilter(resource: IWorkflowDb, filters: { tags: string[]; search: string; }, matches: boolean): boolean {
			if (this.settingsStore.areTagsEnabled && filters.tags.length > 0) {
				matches = matches && filters.tags.every(
					(tag) => (resource.tags as ITag[])?.find((resourceTag) => typeof resourceTag === 'object' ? `${resourceTag.id}` === `${tag}` : `${resourceTag}` === `${tag}`),
				);
			}

			return matches;
		},
		sendFiltersTelemetry(source: string) {
			(this.$refs.layout as IResourcesListLayoutInstance).sendFiltersTelemetry(source);
		},
	},
	watch: {
		'filters.tags'() {
			this.sendFiltersTelemetry('tags');
		},
	},
	mounted() {
		this.usersStore.showPersonalizationSurvey();
	},
});
</script>

<style lang="scss" module>
.emptyStateCard {
	width: 192px;
	text-align: center;
	display: inline-flex;
	height: 230px;

	&:hover {
		svg {
			color: var(--color-primary);
		}
	}
}

.emptyStateCardIcon {
	font-size: 48px;

	svg {
		width: 48px!important;
		color: var(--color-foreground-dark);
		transition: color 0.3s ease;
	}
}
</style>


