import React from 'react';
import { TouchableOpacity } from 'react-native';
import SettingsCard from './SettingsCard';
import SettingsDivider from './SettingsDivider';
import SettingsInputField from './SettingsInputField';
import SettingsInfoRow from './SettingsInfoRow';
import ConnectivityIndicator from './ConnectivityIndicator';

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
  const indicator = (
    <ConnectivityIndicator isLoading={isLoading} isConnected={isAuthenticated} />
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
            <TouchableOpacity onPress={onConnectivityPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {indicator}
            </TouchableOpacity>
          ) : indicator
        }
      />
    </SettingsCard>
  );
};

export default SettingsAuthCard;
