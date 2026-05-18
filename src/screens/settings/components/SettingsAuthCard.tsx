import React from 'react';
import { TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import SettingsDivider from './SettingsDivider';
import SettingsInputField from './SettingsInputField';
import SettingsInfoRow from './SettingsInfoRow';

export type AuthField = {
  label: string;
  value: string | undefined;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
};

type Props = {
  fields: AuthField[];
  isAuthenticated: boolean;
  isLoading: boolean;
  connectivityLabel: string;
  onConnectivityPress?: () => void;
};

const SettingsAuthCard: React.FC<Props> = ({
  fields,
  isAuthenticated,
  isLoading,
  connectivityLabel,
  onConnectivityPress,
}) => {
  const { colors } = useTheme();

  const statusIcon = isLoading ? (
    <SpinningLoaderCircle size={20} color={colors.themeColor} />
  ) : isAuthenticated ? (
    <CheckCircle size={20} color={colors.themeColor} />
  ) : (
    <XCircle size={20} color="#FF3B30" />
  );

  return (
    <SettingsCard>
      {fields.map((field, index) => (
        <SettingsInputField key={index} {...field} />
      ))}
      <SettingsDivider style={{ marginTop: 8 }} />
      <SettingsInfoRow
        label={connectivityLabel}
        right={
          onConnectivityPress ? (
            <TouchableOpacity onPress={onConnectivityPress}>
              {statusIcon}
            </TouchableOpacity>
          ) : statusIcon
        }
      />
    </SettingsCard>
  );
};

export default SettingsAuthCard;
