<template>
  <div class="search-page">
    <header class="search-header">
      <button type="button" class="back-btn" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
        </svg>
        <input
          ref="inputRef"
          v-model="keyword"
          type="search"
          enterkeyhint="search"
          placeholder="搜索剧名、分集"
          @keyup.enter="runSearch"
        />
        <button v-if="keyword" type="button" class="clear-btn" @click="clearKeyword">×</button>
      </div>
    </header>

    <div v-if="!hasServer" class="empty-state">
      <div class="empty-icon">🔗</div>
      请先在设置中配置服务器地址
    </div>

    <div v-else-if="loading" class="loading-box">
      <div class="loading-spinner" />
      <span>搜索中...</span>
    </div>

    <div v-else-if="error" class="card error-card">
      <p>{{ error }}</p>
      <button class="btn btn-ghost" @click="runSearch">重试</button>
    </div>

    <div v-else-if="!keyword.trim()" class="hint-block">
      <p class="hint-title">搜索短剧</p>
      <p class="hint-text">输入剧名或分集标题，快速找到想看的内容</p>
    </div>

    <div v-else-if="results.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      未找到「{{ keyword.trim() }}」相关内容
    </div>

    <div v-else class="results">
      <p class="result-count">找到 {{ total }} 条结果</p>
      <div
        v-for="item in results"
        :key="`${item.type}-${item.id}`"
        class="result-item"
        @click="openItem(item)"
      >
        <SeriesCover
          class="result-cover"
          variant="thumb"
          :cover-url="item.cover_url"
          :title="item.title"
        />
        <div class="result-body">
          <div class="result-tag">{{ item.type === 'series' ? '短剧' : '分集' }}</div>
          <div class="result-title">{{ displayTitle(item) }}</div>
          <div class="result-sub">{{ displaySub(item) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiBaseUrl } from '@/config/server';
import { searchContent } from '@/api/search';
import { smartBack } from '@/utils/navigation';
import SeriesCover from '@/components/SeriesCover.vue';

const route = useRoute();
const router = useRouter();
const inputRef = ref(null);
const keyword = ref(String(route.query.q || ''));
const results = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');

const hasServer = () => Boolean(apiBaseUrl.value);

let debounceTimer = null;

onMounted(async () => {
  await nextTick();
  inputRef.value?.focus();
  if (keyword.value.trim() && hasServer()) runSearch();
});

watch(keyword, (val) => {
  clearTimeout(debounceTimer);
  if (!val.trim()) {
    results.value = [];
    total.value = 0;
    error.value = '';
    return;
  }
  debounceTimer = setTimeout(runSearch, 350);
});

function goBack() {
  smartBack(router, '/');
}

function clearKeyword() {
  keyword.value = '';
  results.value = [];
  total.value = 0;
  inputRef.value?.focus();
}

async function runSearch() {
  const q = keyword.value.trim();
  if (!q || !hasServer()) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await searchContent(q);
    results.value = data.list || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = e.message || '搜索失败';
    results.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function displayTitle(item) {
  if (item.type === 'episode') return item.series_title || item.title;
  return item.title;
}

function displaySub(item) {
  if (item.type === 'episode') {
    return `第 ${item.episode_number} 集 · ${item.title}`;
  }
  return `共 ${item.episode_count || 0} 集`;
}

function openItem(item) {
  if (item.type === 'episode') {
    router.push(`/play/${item.id}`);
    return;
  }
  router.push(`/series/${item.id}`);
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: calc(12px + var(--safe-top)) 16px calc(16px + var(--safe-bottom));
}

.search-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-btn svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.search-input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border-radius: 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input-wrap input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
}

.clear-btn {
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
}

.hint-block {
  padding: 48px 12px;
  text-align: center;
}

.hint-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hint-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.result-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.result-item:active {
  background: var(--bg-card-hover);
}

.result-cover {
  width: 72px;
  flex-shrink: 0;
}

.result-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.result-tag {
  display: inline-block;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 8px;
  margin-bottom: 6px;
}

.result-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.result-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.error-card p {
  color: var(--accent);
  margin-bottom: 12px;
}
</style>
