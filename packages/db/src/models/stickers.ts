import type { CoreMessageMedia } from '../../../core/src'

// https://github.com/moeru-ai/airi/blob/main/services/telegram-bot/src/models/stickers.ts
import { Buffer } from 'node:buffer'

import { Ok } from '@tg-search/common/utils/monad'
import { desc, eq } from 'drizzle-orm'

import { withDb } from '../drizzle'
import { recentSentStickersTable } from '../schemas/recent_sent_stickers'
import { stickersTable } from '../schemas/stickers'

export async function findStickerDescription(fileId: string) {
  const sticker = (await findStickerByFileId(fileId))?.unwrap()
  if (sticker == null) {
    return ''
  }

  return Ok(sticker.description)
}

export async function findStickerByFileId(fileId: string) {
  const sticker = (await withDb(db => db
    .select()
    .from(stickersTable)
    .where(eq(stickersTable.file_id, fileId))
    .limit(1),
  )).expect('Failed to find sticker by file ID')

  if (sticker.length === 0) {
    return undefined
  }

  return Ok(sticker[0])
}

export async function recordSticker(sticker: CoreMessageMedia & { sticker_id: string, emoji?: string }) {
  // 如果file_id已经存在，则跳过插入插入
  const existingSticker = await findStickerByFileId(sticker.sticker_id)
  if (existingSticker == null) {
    return withDb(async db => db
      .insert(stickersTable)
      .values({
        platform: 'telegram',
        file_id: sticker.sticker_id,
        sticker_bytes: sticker.byte ? Buffer.from(sticker.byte) : null,
        sticker_path: sticker.path,
        description: '',

        name: '',
        emoji: sticker.emoji || '',
        label: '',
      })
      .returning(),
    )
  }
}
export async function recordStickers(stickers: (CoreMessageMedia & { sticker_id: string })[]) {
  return Promise.all(stickers.map(sticker => recordSticker(sticker)))
}

export async function listRecentSentStickers() {
  return withDb(db => db
    .select()
    .from(recentSentStickersTable)
    .orderBy(desc(recentSentStickersTable.created_at)),
  )
}
