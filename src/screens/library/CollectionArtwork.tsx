import React from 'react'
import { StyleSheet, View } from 'react-native'

import { MediaImage } from '@/components/MediaImage'
import { radius } from '@/constants/design'
import type { CoverSource } from '@/types'

/** Below this, a grid of near-empty quarters looks like a mistake. */
const MOSAIC_MINIMUM = 4

type Props = {
  covers: CoverSource[]
  size: number
}

/**
 * Something to look at above a collection.
 *
 * Album, artist and genre screens all open on a cover; a collection has none of
 * its own, which is what left these screens reading as a title floating over a
 * list. It borrows one instead — four covers quartered into a single tile, or
 * the first one alone when there aren't four to arrange, so the screen is
 * always anchored by the music actually in it.
 */
const CollectionArtwork: React.FC<Props> = ({ covers, size }) => {
  const tile = { width: size, height: size, borderRadius: radius.card }

  if (covers.length < MOSAIC_MINIMUM) {
    return (
      <View style={[styles.frame, tile]}>
        <MediaImage cover={covers[0] ?? null} size="grid" style={styles.fill} />
      </View>
    )
  }

  return (
    <View style={[styles.frame, styles.mosaic, tile]}>
      {covers.slice(0, MOSAIC_MINIMUM).map((cover, index) => (
        <MediaImage
          key={index}
          cover={cover}
          size="grid"
          style={{ width: size / 2, height: size / 2 }}
        />
      ))}
    </View>
  )
}

export default CollectionArtwork

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap' },
  fill: { width: '100%', height: '100%' },
})
