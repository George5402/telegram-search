<script setup lang="ts">
import type { CoreMessage, CoreMessageMediaTypes } from '@tg-search/core/types'

import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  message: CoreMessage
}>()

const isMedia = computed(() => {
  return props.message.media?.length
})

const mediaSrc = ref<string | null>(null)
const mediaType = ref<CoreMessageMediaTypes>('unknown')
const isLoading = computed(() => {
  return mediaSrc.value === null && isMedia.value
})
const error = ref<string | null>(null)

async function processMedia() {
  try {
    // 重置状态
    mediaSrc.value = null
    mediaType.value = 'unknown'
    error.value = null

    if (!isMedia.value)
      return

    for (const mediaItem of props.message.media!) {
      if (!mediaItem.base64)
        continue
      // todo 处理 document 类型
      const apiMedia = mediaItem.apiMedia as any
      if (apiMedia && apiMedia.className === 'MessageMediaDocument') {
        if (apiMedia.document) {
          const isSticker = apiMedia.document.attributes.find((attr: any) => attr.className === 'DocumentAttributeSticker')
          // video/webm
          mediaSrc.value = `data:video/webm;base64,${mediaItem.base64}`
          mediaType.value = isSticker ? 'sticker' : 'unknown' as CoreMessageMediaTypes
          return
        }
      }
      const base64 = mediaItem.base64
      if (typeof base64 === 'string') {
        mediaSrc.value = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
        mediaType.value = mediaItem.type
        return
      }

      // TODO: Process first valid media item only
      break
    }
  }
  catch (err) {
    console.error('Error processing media:', err)
    error.value = 'Failed to process media'
  }
}

// 监听 message 变化，重新处理媒体
watch(
  () => props.message,
  () => {
    processMedia()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <!-- Show text content if available -->
  <div v-if="message.content" class="mb-2">
    {{ message.content }}
  </div>

  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center gap-2">
    <div class="i-lucide-loader-circle h-4 w-4 animate-spin" />
    <span class="text-xs text-complementary-600">处理媒体中...</span>
  </div>

  <!-- Error state -->
  <div v-else-if="error" class="flex items-center gap-2 rounded bg-red-100 p-2 dark:bg-red-900">
    <div class="i-lucide-alert-circle h-4 w-4 text-red-500" />
    <span class="text-sm text-red-700 dark:text-red-300">{{ error }}</span>
  </div>

  <!-- Media content -->
  <div v-else-if="mediaSrc">
    <!-- Images -->
    <img
      v-if="mediaType === 'photo'"
      :src="mediaSrc"
      class="h-auto max-w-full max-w-xs rounded-lg"
      alt="Media content"
      @error="error = 'Image failed to load'"
    >
    <video
      v-if="mediaType === 'sticker'"
      :src="mediaSrc"
      class="h-auto max-w-full max-w-xs rounded-lg"
      alt="Media content"
      autoplay
    />

    <!-- Others -->
    <div
      v-else
      class="flex items-center gap-2 rounded bg-gray-100 p-3 dark:bg-gray-800"
    >
      <div class="i-lucide-file h-5 w-5" />
      <div class="flex-1">
        <span class="text-sm font-medium">文档文件</span>
        <div class="text-xs text-gray-500">
          点击下载
        </div>
      </div>
      <a
        :href="mediaSrc"
        :download="`file_${message.platformMessageId}`"
        class="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
      >
        下载
      </a>
    </div>
  </div>
</template>
