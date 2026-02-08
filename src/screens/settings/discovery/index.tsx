import React from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
  View,
  Text,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { useTheme } from '@/hooks/useTheme'

const DiscoverySettings: React.FC = () => {
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title={t('settings.discovery.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            {t('settings.discovery.sections.about.title')}
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            {t('settings.discovery.sections.about.body')}
          </Text>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            {t('settings.discovery.sections.how.title')}
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            {t('settings.discovery.sections.how.body')}
          </Text>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}
          >
            {t('settings.discovery.sections.sync.title')}
          </Text>
          <Text
            style={[styles.infoText, isDarkMode && styles.infoTextDark]}
          >
            {t('settings.discovery.sections.sync.body')}
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
