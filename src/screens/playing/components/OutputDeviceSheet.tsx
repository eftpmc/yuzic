import React, { forwardRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Airplay, Cast, Check, Plus, RotateCcw, Smartphone } from 'lucide-react-native';
import IconActionButton from '@/components/IconActionButton';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useDlnaDiscovery, type DiscoveredDevice } from '@/hooks/useDlnaDiscovery';
import { useCast } from '@/contexts/CastContext';
import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

const {
  AirplayButton,
  useAirplayRoutes,
// eslint-disable-next-line @typescript-eslint/no-require-imports
} = Platform.OS === 'ios' ? require('react-airplay') : { AirplayButton: null, useAirplayRoutes: () => [] };

const OutputDeviceSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const themeColor = useSelector(selectThemeColor);
  const { devices, isScanning, isProbing, scan, probeManual } = useDlnaDiscovery();
  const {
    activeDevice, isConnecting, connectToDevice, disconnectDevice,
  } = useCast();
  const airplayRoutes = useAirplayRoutes();
  const airplayDevice = airplayRoutes[0] ?? null;

  const handleOpen = useCallback(() => { scan(); }, [scan]);

  const [connectingDlnaUdn, setConnectingDlnaUdn] = useState<string | null>(null);

  const handleConnectDlna = useCallback(async (device: DiscoveredDevice) => {
    setConnectingDlnaUdn(device.udn);
    try {
      await connectToDevice(device);
      (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
    } catch {
      toast.error('Could not connect to device');
    } finally {
      setConnectingDlnaUdn(null);
    }
  }, [connectToDevice, ref]);

  const handleManualEntry = useCallback(() => {
    Alert.prompt(
      'Add Device',
      'Enter the IP address of your DLNA device',
      async (ip) => {
        if (!ip?.trim()) return;
        const device = await probeManual(ip);
        if (!device) toast.error('No DLNA device found at that address');
      },
      'plain-text',
      '',
      'decimal-pad',
    );
  }, [probeManual]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['55%', '80%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      stackBehavior="push"
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onChange={(index) => { if (index >= 0) handleOpen(); }}
    >
      <BottomSheetView style={styles.container}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.secondary }]}>Connect</Text>
          <IconActionButton
            icon={<RotateCcw size={iconSize.inline} color={colors.subtext} />}
            onPress={scan}
            loading={isScanning}
            accessibilityLabel={t('a11y.scanForDevices')}
            size="compact"
          />
        </View>

        {/* This device — highlighted only when nothing is casting via DLNA or AirPlay */}
        <Touchable
          style={[styles.item, { backgroundColor: !activeDevice && !airplayDevice ? themeColor + '22' : 'transparent', borderRadius: rad.md }]}
          onPress={async () => {
            if (activeDevice) await disconnectDevice();
            (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
          }}
        >
          <View style={styles.itemLeft}>
            <Smartphone size={iconSize.row} color={!activeDevice && !airplayDevice ? themeColor : colors.subtext} />
            <Text style={[styles.itemLabel, { color: colors.secondary }]}>This device</Text>
          </View>
          {!activeDevice && !airplayDevice && <Check size={iconSize.row} color={themeColor} />}
        </Touchable>

        {/* AirPlay — iOS only */}
        {Platform.OS === 'ios' && AirplayButton && (
          <View style={[styles.item, { backgroundColor: airplayDevice ? themeColor + '22' : 'transparent', borderRadius: rad.md }]}>
            <View style={styles.itemLeft}>
              <Airplay size={iconSize.row} color={airplayDevice ? themeColor : colors.subtext} />
              <Text style={[
                styles.itemLabel,
                { color: colors.secondary, fontWeight: airplayDevice ? '600' : '400' },
              ]}
              >
                {airplayDevice ? airplayDevice.portName : 'AirPlay'}
              </Text>
            </View>
            {airplayDevice && <Check size={iconSize.row} color={themeColor} />}
            <AirplayButton
              style={StyleSheet.absoluteFillObject}
              tintColor="transparent"
              activeTintColor="transparent"
            />
          </View>
        )}

        {/* ── DLNA ── */}
        {(devices.length > 0 || activeDevice || isScanning) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>DLNA / UPnP</Text>
          </>
        )}

        {/* Active DLNA device */}
        {activeDevice && (
          <Touchable
            style={[styles.item, { backgroundColor: themeColor + '22', borderRadius: rad.md }]}
            onPress={disconnectDevice}
          >
            <View style={styles.itemLeft}>
              <Cast size={iconSize.row} color={themeColor} />
              <Text style={[styles.itemLabel, { color: colors.secondary, fontWeight: '600' }]}>
                {activeDevice.name}
              </Text>
            </View>
            <Check size={iconSize.row} color={themeColor} />
          </Touchable>
        )}

        {/* Discovered DLNA devices */}
        {devices.map(device => {
          if (activeDevice?.udn === device.udn) return null;
          return (
            <Touchable
              key={device.udn}
              style={[styles.item, { backgroundColor: 'transparent', borderRadius: rad.md }]}
              onPress={() => handleConnectDlna(device)}
              disabled={isConnecting}
            >
              <View style={styles.itemLeft}>
                <Cast size={iconSize.row} color={colors.subtext} />
                <Text style={[styles.itemLabel, { color: colors.secondary }]}>{device.name}</Text>
              </View>
              {connectingDlnaUdn === device.udn && <SpinningLoaderCircle size={iconSize.row} color={colors.subtext} />}
            </Touchable>
          );
        })}

        {/* Scanning / empty state */}
        {isScanning && devices.length === 0 && !activeDevice && (
          <View style={styles.searchingRow}>
            <SpinningLoaderCircle size={iconSize.inline} color={colors.subtext} />
            <Text style={[styles.empty, { color: colors.subtext, paddingVertical: 0 }]}>
              Searching for devices...
            </Text>
          </View>
        )}
        {!isScanning && devices.length === 0 && !activeDevice && (
          <Text style={[styles.empty, { color: colors.subtext }]}>
            No devices found on your network.
          </Text>
        )}

        {/* Manual DLNA entry */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Touchable
          style={[styles.item, { backgroundColor: 'transparent', borderRadius: rad.md }]}
          onPress={handleManualEntry}
          disabled={isProbing}
        >
          <View style={styles.itemLeft}>
            {isProbing
              ? <SpinningLoaderCircle size={iconSize.row} color={colors.subtext} />
              : <Plus size={iconSize.row} color={colors.subtext} />
            }
            <Text style={[styles.itemLabel, { color: colors.subtext }]}>Add device manually</Text>
          </View>
        </Touchable>

      </BottomSheetView>
    </BottomSheetModal>
  );
});

OutputDeviceSheet.displayName = 'OutputDeviceSheet';
export default OutputDeviceSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.roomy,
    paddingTop: spacing.controlGap,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.controlGap,
  },
  title: {
    ...typography.sheetTitle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLabel: {
    ...typography.body,
  },
  empty: {
    ...typography.rowSubtitle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.tight,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
