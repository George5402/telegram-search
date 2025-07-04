import type { CorePagination } from '@tg-search/common/utils/pagination'
import type { CoreMessage } from '@tg-search/core'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { useSettingsStore } from './useSettings'
import { useWebsocketStore } from './useWebsocket'

export const useMessageStore = defineStore('message', () => {
  // TODO: performance, LRU cache or shallow ref, vertical view
  const messagesByChat = ref<Map<string, Map<string, CoreMessage>>>(new Map())

  const websocketStore = useWebsocketStore()

  function useMessageChatMap(chatId: string) {
    if (!messagesByChat.value.has(chatId)) {
      messagesByChat.value.set(chatId, new Map())
    }

    return messagesByChat.value.get(chatId)!
  }

  async function pushMessages(messages: CoreMessage[]) {
    messages.forEach((message) => {
      const { chatId } = message

      const chatMap = useMessageChatMap(chatId)

      function getMediaMimeType(mediaType: string): string {
        switch (mediaType) {
          case 'photo':
            return 'image/jpeg'
          case 'sticker':
            // Telegram stickers are usually WebM or WebP
            return 'video/webm'
          case 'document':
            return 'application/octet-stream'
          default:
            return 'application/octet-stream'
        }
      }

      for (const media of message.media ?? []) {
        if (media.byte) {
          const buffer = new Uint8Array((media.byte as any).data)

          const mimeType = getMediaMimeType(media.type)
          const blob = new Blob([buffer], { type: mimeType })
          const url = URL.createObjectURL(blob)
          media.blobUrl = url

          // eslint-disable-next-line no-console
          console.log('[MessageStore] Blob URL created:', {
            url,
            mimeType,
            blobSize: blob.size,
          })

          media.byte = undefined
        }

        if (media.base64) {
          media.base64 = undefined
        }
      }

      chatMap.set(message.platformMessageId, message)
    })
  }

  async function fetchMessagesWithDatabase(chatId: string, pagination: CorePagination) {
    toast.promise(async () => {
      let restMessageLength = pagination.limit
      const dbMessages: CoreMessage[] = []

      if (!useSettingsStore().messageDebugMode) {
        websocketStore.sendEvent('storage:fetch:messages', { chatId, pagination })
        const { messages: dbMessages } = await websocketStore.waitForEvent('storage:messages')

        restMessageLength = pagination.limit - dbMessages.length
        // eslint-disable-next-line no-console
        console.log(`[MessageStore] Fetched ${dbMessages.length} messages from database, rest messages length ${restMessageLength}`)
      }

      if (restMessageLength > 0) {
        pagination.offset += dbMessages.length
        toast.promise(async () => {
          websocketStore.sendEvent('message:fetch', { chatId, pagination })
        }, {
          loading: 'Fetching messages from server...',
        })
      }
    }, {
      loading: 'Loading messages from database...',
      success: 'Messages loaded',
      error: 'Error loading messages',
    })
  }

  return {
    messagesByChat,
    pushMessages,
    useMessageChatMap,
    fetchMessagesWithDatabase,
  }
})
