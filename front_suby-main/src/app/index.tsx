import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View
} from 'react-native';

const subyLogo = require('../../assets/images/suby-brand.png');

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(10)).current;

  const dotsOpacity = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.stagger(250, [
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0.4,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0.4,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0.4,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.backgroundCircles}>
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Image source={subyLogo} style={styles.logoImage} resizeMode="cover" />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleY }],
            },
          ]}
        >
          Tu plataforma de subastas premium
        </Animated.Text>

        <Animated.View style={[styles.loadingContainer, { opacity: dotsOpacity }]}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot1,
                transform: [
                  {
                    scale: dot1.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot2,
                transform: [
                  {
                    scale: dot2.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot3,
                transform: [
                  {
                    scale: dot3.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#653728',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  circleTopRight: {
    position: 'absolute',
    top: -128,
    right: -128,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: '#F97316',
    opacity: 0.1,
  },

  circleBottomLeft: {
    position: 'absolute',
    bottom: -128,
    left: -128,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: '#F97316',
    opacity: 0.1,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  logoContainer: {
    marginBottom: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    overflow: 'hidden',
    backgroundColor: '#653728',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.28,
    shadowRadius: 20,

    elevation: 14,
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 56,
  },

  loadingContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
  },
});
