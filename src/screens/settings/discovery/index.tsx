import React from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
  View,
  Text,
} from 'react-native'
import Header from '../components/Header'
import { useTheme } from '@/hooks/useTheme'

const DiscoverySettings: React.FC = () => {
  const { isDarkMode } = useTheme()

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title="Discovery" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            Discovery
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            The Discovery tab suggests artists and albums based on your library.
            You see similar artists, albums you might like, and new releases
            from those artists.
          </Text>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            How it works
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            We use your library artists to find similar artists via MusicBrainz
            and ListenBrainz. From those we pull albums and new releases, then
            show a shuffled mix in Explore.
          </Text>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            Sync & refresh
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            Discovery syncs when you connect to a server. Pull to refresh on
            Discovery only shuffles what’s already loaded; it doesn’t re-fetch. If
            something fails, you’ll see a message and can tap “Try again” to
            retry.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default DiscoverySettings

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  infoTextDark: {
    color: '#aaa',
  },
})
