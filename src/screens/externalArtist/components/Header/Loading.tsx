import React from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { Skeleton } from 'moti/skeleton'
import { useTheme } from '@/hooks/useTheme'

export default function LoadingExternalArtistHeader() {
  const { isDarkMode } = useTheme()
  const colorMode = isDarkMode ? 'dark' : 'light'

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        <Skeleton
          width="100%"
          height={300}
          colorMode={colorMode}
        />
        <View style={styles.centeredCoverContainer}>
          <Skeleton
            width={120}
            height={120}
            radius={60}
            colorMode={colorMode}
          />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Skeleton
            width={180}
            height={28}
            radius={6}
            colorMode={colorMode}
          />
          <View style={{ marginTop: 8 }}>
            <Skeleton
              width={120}
              height={14}
              radius={6}
              colorMode={colorMode}
            />
          </View>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centeredCoverContainer: {
    position: 'absolute',
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
})
