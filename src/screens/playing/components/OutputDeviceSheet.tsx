import React, { forwardRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Airplay, Cast, Check, Plus, RotateCcw } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useDlnaDiscovery, type DiscoveredDevice } from '@/hooks/useDlnaDiscovery';
import { useCast } from '@/contexts/CastContext';

const AirplayButton = Platform.OS === 'ios'
  ? require('react-airplay').AirplayButton
  : null;

const OutputDeviceSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const { devices, isScanning, isProbing, scan, probeManual } = useDlnaDiscovery();
  const { activeDevice, isConnecting, connectToDevice, disconnectDevice } = useCast();

  const handleOpen = useCallback(() => { scan(); }, [scan]);

  const handleConnect = useCallback(async (device: DiscoveredDevice) => {
    try {
      await connectToDevice(device);
      (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
    } catch {
      toast.error('Could not connect to device');
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

  const isActive = (udn: string) => activeDevice?.udn === udn;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['45%']}
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
          <TouchableOpacity onPress={scan} disabled={isScanning} style={styles.titleAction} activeOpacity={0.6}>
            {isScanning
              ? <SpinningLoaderCircle size={16} color={colors.subtext} />
              : <RotateCcw size={16} color={colors.subtext} />
            }
          </TouchableOpacity>
        </View>

        {/* AirPlay — iOS only */}
        {Platform.OS === 'ios' && AirplayButton && (
          <View style={[styles.item, { backgroundColor: 'transparent' }]}>
            <View style={styles.itemLeft}>
              <Airplay size={18} color={colors.subtext} />
              <Text style={[styles.itemLabel, { color: colors.secondary }]}>AirPlay</Text>
            </View>
            <AirplayButton
              style={StyleSheet.absoluteFillObject}
              tintColor="transparent"
              activeTintColor="transparent"
            />
          </View>
        )}

        {/* Active device */}
        {activeDevice && (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: themeColor + '22' }]}
            onPress={disconnectDevice}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <Cast size={18} color={themeColor} />
              <Text style={[styles.itemLabel, { color: colors.secondary, fontWeight: '600' }]}>
                {activeDevice.name}
              </Text>
            </View>
            <Check size={18} color={themeColor} />
          </TouchableOpacity>
        )}

        {/* Discovered devices */}
        {devices.map(device => {
          if (isActive(device.udn)) return null;
          return (
            <TouchableOpacity
              key={device.udn}
              style={[styles.item, { backgroundColor: 'transparent' }]}
              onPress={() => handleConnect(device)}
              disabled={isConnecting}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <Cast size={18} color={colors.subtext} />
                <Text style={[styles.itemLabel, { color: colors.secondary }]}>{device.name}</Text>
              </View>
              {isConnecting && <SpinningLoaderCircle size={18} color={colors.subtext} />}
            </TouchableOpacity>
          );
        })}

        {/* Empty state */}
        {!isScanning && devices.length === 0 && !activeDevice && (
          <Text style={[styles.empty, { color: colors.subtext }]}>
            No devices found on your network.
          </Text>
        )}

        {/* Manual entry */}
        <TouchableOpacity
          style={[styles.item, { backgroundColor: 'transparent' }]}
          onPress={handleManualEntry}
          disabled={isProbing}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            {isProbing
              ? <SpinningLoaderCircle size={18} color={colors.subtext} />
              : <Plus size={18} color={colors.subtext} />
            }
            <Text style={[styles.itemLabel, { color: colors.subtext }]}>Add device manually</Text>
          </View>
        </TouchableOpacity>

      </BottomSheetView>
    </BottomSheetModal>
  );
});

OutputDeviceSheet.displayName = 'OutputDeviceSheet';
export default OutputDeviceSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleAction: {
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLabel: {
    fontSize: 16,
  },
  empty: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
