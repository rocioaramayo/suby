import { PRIMARY_BROWN } from '@/theme/colors';
import { Image, StyleSheet, View } from 'react-native';

type BrandLogoProps = {
  size?: number;
  variant?: 'full' | 'badge';
};

const brandLogoSource = require('../../assets/images/suby-brand.png');

export function BrandLogo({ size = 80, variant = 'full' }: BrandLogoProps) {
  if (variant === 'badge') {
    return (
      <View
        style={[
          styles.badgeContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Image source={brandLogoSource} style={styles.badgeImage} resizeMode="cover" />
      </View>
    );
  }

  return (
    <Image
      source={brandLogoSource}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    overflow: 'hidden',
    backgroundColor: PRIMARY_BROWN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
});
