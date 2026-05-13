import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

export type ExternalSource = 'deezer'

type SourceMeta = {
  id: ExternalSource
  label: string
  color: string
  letter: string
}

const SOURCES: SourceMeta[] = [
  { id: 'deezer', label: 'Deezer', color: '#A238CA', letter: 'D' },
]

type Props = {
  activeSource: ExternalSource | null
  onToggle: (source: ExternalSource) => void
  isOffline: boolean
}

export default function SourceToggleBar({ activeSource, onToggle, isOffline }: Props) {
  const { isDarkMode } = useTheme()

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {SOURCES.map(source => {
          const isActive = activeSource === source.id
          const isDisabled = isOffline

          return (
            <TouchableOpacity
              key={source.id}
              onPress={() => !isDisabled && onToggle(source.id)}
              activeOpacity={isDisabled ? 1 : 0.7}
              style={[
                styles.pill,
                isDarkMode && styles.pillDark,
                isActive && { backgroundColor: source.color, borderColor: source.color },
                isDisabled && styles.pillDisabled,
              ]}
            >
              <View style={[styles.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : source.color }]}>
                <Text style={styles.badgeLetter}>{source.letter}</Text>
              </View>
              <Text
                style={[
                  styles.pillText,
                  isDarkMode && styles.pillTextDark,
                  isActive && styles.pillTextActive,
                  isDisabled && styles.pillTextDisabled,
                ]}
              >
                {source.label}
                {isDisabled ? ' · offline' : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  pillDark: {
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillDisabled: {
    opacity: 0.45,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  pillTextDark: {
    color: '#fff',
  },
  pillTextActive: {
    color: '#fff',
  },
  pillTextDisabled: {
    color: '#999',
  },
})
