import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useNavigation } from "@react-navigation/native";
import FastImage from "react-native-fast-image";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    key: "1",
    title: "Shopping Was Boring. Now It’s",
    highlight: " Live.",
    text: "Join live shows where real people sell real food — one sour war, cookie drop, and meal kit at a time.",
    image: require("../assets/onboarding/onboarding1.png"),
  },
  {
    key: "2",
    title: "Watch. Chat. Buy. In Real-Time.",
    text: "No more guessing. Ask questions. Watch it unboxed, tasted, used, live. This is how food should be sold.",
    image: require("../assets/onboarding/onboarding2.png"),
  },
  {
    key: "3",
    title: "Deals That Sell Out On-Air.",
    text: "Limited drops. Live reviews. Viral flavors. You blink — it’s gone. Are you ready to experience Stogora?",
    image: require("../assets/onboarding/onboarding4.png"),
  },
];

export default function OnboardingScreen() {
  const carouselRef = useRef(null);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        loop={false}
        width={width}
        height={height}
        autoPlay={false}
        pagingEnabled
        data={slides}
        scrollAnimationDuration={500}
        renderItem={({ item, index }) => (
          <View style={styles.slide}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {item.key === "1" ? (
                  <>
                    <Text style={styles.titleMain}>{item.title}</Text>
                    <Text style={styles.titleAccent}>{item.highlight}</Text>
                  </>
                ) : (
                  item.title
                )}
              </Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>

            <View style={styles.imageWrapper}>
              <FastImage
                source={item.image}
                style={styles.image}
                resizeMode={FastImage.resizeMode.cover}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                index === slides.length - 1
                  ? navigation.replace("Signup")
                  : carouselRef.current?.next()
              }
            >
              <Text style={styles.buttonText}>
                {index === slides.length - 1 ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
  },
  slide: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  textContainer: {
    width: "100%",
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 10,
  },
  titleMain: {
    color: "#213E4D",
  },
  titleAccent: {
    color: "#E76A54",
  },
  text: {
    fontSize: 17,
    color: "#213E4D",
    textAlign: "center",
    lineHeight: 25,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  imageWrapper: {
    width: width * 0.9,
    height: height * 0.50,
    maxHeight: 420,
    borderRadius: 32,
    overflow: "hidden",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 32,
  },
  image: {
    width: "100%",
    height: "105%",
  },
  button: {
    backgroundColor: "#213E4D",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 32,
    width: "90%",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
