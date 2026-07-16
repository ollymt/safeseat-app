// components/AddProfileModal.tsx
import { Themes } from "@/constants/theme";
import {
  BottomSheet,
  Button,
  Column,
  FieldGroup,
  Host,
  Icon,
  Picker,
  Row,
  Spacer,
  Text,
  TextInput,
} from "@expo/ui";
import {
  ConfirmationDialog,
  DatePicker,
  Button as SwiftButton,
} from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  presentationDetents,
  submitLabel,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store"; // 🌟 Import SecureStore
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, useColorScheme } from "react-native";

// 🛠️ Firebase Imports
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const bloodTypes = [
  { label: "Not Set", value: "none" },
  { label: "A+", value: "a+" },
  { label: "A-", value: "a-" },
  { label: "B+", value: "b+" },
  { label: "B-", value: "b-" },
  { label: "AB+", value: "ab+" },
  { label: "AB-", value: "ab-" },
  { label: "O+", value: "o+" },
  { label: "O-", value: "o-" },
];

export default function AddProfileModal({
  visible,
  onClose,
  onSuccess,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState(new Date());

  const [isMetric, setIsMetric] = useState(true); // 🌟 Defaults to true, syncs dynamically with SecureStore

  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  const [weightKg, setWeightKg] = useState("");
  const [weightLb, setWeightLb] = useState("");

  const [bloodType, setBloodType] = useState("none");

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);

  // 🌟 Load unit settings dynamically when modal is shown
  // Update this block in components/AddProfileModal.tsx
  // 🌟 Load unit settings dynamically when modal is shown
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const loadUnitPreference = async () => {
        let localValueFound = false;

        try {
          // Layer 1: Check SecureStore (Instant & Offline-friendly)
          const savedPrivacyString =
            await SecureStore.getItemAsync("user_privacy_prefs");
          console.log(
            "[Modal] Raw savedPrivacyString loaded:",
            savedPrivacyString,
          );

          if (savedPrivacyString) {
            const savedPrivacy = JSON.parse(savedPrivacyString);

            // Check for both key variations just in case (useMetric or isMetric)
            const targetKey =
              savedPrivacy.useMetric !== undefined
                ? savedPrivacy.useMetric
                : savedPrivacy.isMetric;

            if (targetKey !== undefined) {
              const normalizedMetric =
                targetKey === true || targetKey === "true";
              console.log(
                "[Modal] Layer 1 (Cache) success. Setting isMetric to:",
                normalizedMetric,
              );
              setIsMetric(normalizedMetric);
              localValueFound = true;
            }
          }
        } catch (error) {
          console.error("Failed to read SecureStore in modal:", error);
        }

        // Layer 2: Cloud Fallback / Direct Sync verification
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            console.log(
              "[Modal] Syncing with Firestore subcollection for direct confirmation...",
            );
            const settingsDocRef = doc(
              db,
              "users",
              currentUser.uid,
              "settings",
              "preferences",
            );
            const settingsDocSnap = await getDoc(settingsDocRef);

            if (settingsDocSnap.exists()) {
              const settingsData = settingsDocSnap.data();
              console.log(
                "[Modal] Layer 2 (Firestore) data fetched:",
                settingsData,
              );

              // Check all potential field names coming from your subcollection
              const cloudMetricVal =
                settingsData.useMetric !== undefined
                  ? settingsData.useMetric
                  : settingsData.isMetric;

              if (cloudMetricVal !== undefined) {
                const normalizedMetric =
                  cloudMetricVal === true || cloudMetricVal === "true";
                console.log(
                  "[Modal] Applying current Firestore value to state:",
                  normalizedMetric,
                );

                setIsMetric(normalizedMetric);

                // Refresh the local cache immediately to flush out old configurations
                const combinedPrivacy = {
                  useMetric: normalizedMetric,
                  consent: settingsData.consent ?? true,
                  emergencyEscalation: settingsData.emergencyEscalation ?? true,
                };
                await SecureStore.setItemAsync(
                  "user_privacy_prefs",
                  JSON.stringify(combinedPrivacy),
                );
                return;
              }
            }
          }
        } catch (cloudError) {
          console.error(
            "Failed to clear cloud validation fallback in modal:",
            cloudError,
          );
        }
      };

      loadUnitPreference();
    }
  }, [visible]);

  // Helper functions to safely check numeric inputs
  const parseNum = (val: string) => parseFloat(val) || 0;

  const hasUnsavedChanges =
    name !== "" ||
    icon !== "" ||
    email !== "" ||
    phone !== "" ||
    parseNum(heightCm) > 0 ||
    parseNum(heightFt) > 0 ||
    parseNum(heightIn) > 0 ||
    parseNum(weightKg) > 0 ||
    parseNum(weightLb) > 0;

  // 🌟 Birthday Validation: Must be at least 18 years old
  const isUnder18 = (() => {
    if (!birthday) return true;
    const today = new Date();
    const ageLimitDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    return birthday > ageLimitDate;
  })();

  const isHeightInvalid = isMetric
    ? parseNum(heightCm) <= 0
    : parseNum(heightFt) <= 0 || parseNum(heightIn) <= 0;

  const isWeightInvalid = isMetric
    ? parseNum(weightKg) <= 0
    : parseNum(weightLb) <= 0;

  const isFormInvalid =
    name.trim() === "" ||
    email.trim() === "" ||
    phone.trim() === "" ||
    !birthday ||
    isUnder18 || // 🌟 Enforced 18+ limit
    isHeightInvalid ||
    isWeightInvalid;

  const handleResetAndClose = () => {
    setName("");
    setIcon("");
    setEmail("");
    setPhone("");
    setBirthday(new Date());
    setHeightCm("");
    setHeightFt("");
    setHeightIn("");
    setWeightKg("");
    setWeightLb("");
    setBloodType("none");
    setDiscardConfirmVisible(false);
    onClose();
  };

  // 🌟 Save Logic directly connecting to Firestore Subcollection
  // 🌟 Save Logic directly connecting to Firestore Subcollection with auto-conversion
  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Authentication Error",
        "You must be signed in to add profiles.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const subcollectionRef = collection(
        db,
        "users",
        currentUser.uid,
        "profiles",
      );

      // 🧮 Conversion Logic
      let finalHeightCm = 0;
      let finalWeightKg = 0;

      if (isMetric) {
        finalHeightCm = parseNum(heightCm);
        finalWeightKg = parseNum(weightKg);
      } else {
        // Imperial to Metric conversion
        const totalInches = parseNum(heightFt) * 12 + parseNum(heightIn);
        finalHeightCm = Math.round(totalInches * 2.54 * 10) / 10; // Round to 1 decimal place

        finalWeightKg = Math.round(parseNum(weightLb) * 0.45359237 * 10) / 10; // Round to 1 decimal place
      }

      await addDoc(subcollectionRef, {
        name: name.trim(),
        icon: icon.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        birthday: birthday.toISOString(),
        bloodType: bloodType,
        // Saving both values strictly normalized to Metric system values
        heightCm: finalHeightCm,
        weightKg: finalWeightKg,
        // Keeps a readable layout backup string based on what they initially input
        displayHeight: isMetric
          ? `${heightCm} cm`
          : `${heightFt} ft ${heightIn} in`,
        displayWeight: isMetric ? `${weightKg} kg` : `${weightLb} lb`,
        createdAt: new Date().toISOString(),
      });

      handleResetAndClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving profile to Firestore: ", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Save Error",
        "Failed to create this profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 Modal body. `Column` is a native Compose view on Android (and SwiftUI on iOS),
  // so it must be a direct child of <Host>/<BottomSheet> — no plain RN <View> in between.
  // `style.backgroundColor` here is a cross-platform prop that Column translates to the
  // right native modifier on each platform, so no Group/View wrapper is needed at all.
  const renderModalContent = () => (
    <Column
      spacing={16}
      alignment="center"
      style={{
        backgroundColor: activeScheme === "dark" ? "#1C1C1E" : "#F2F2F6",
      }}
    >
      {/* 🧭 Header Navigation Row */}
      <Row>
        {/* 🌟 ConfirmationDialog is a SwiftUI-only component (no Android native view).
                On Android we fall back to RN's Alert.alert for the same discard-confirm flow. */}
        {Platform.OS === "ios" ? (
          <ConfirmationDialog
            title="Discard your progress?"
            isPresented={discardConfirmVisible}
            onIsPresentedChange={setDiscardConfirmVisible}
            titleVisibility="visible"
          >
            <ConfirmationDialog.Trigger>
              <Button
                variant="outlined"
                onPress={() => {
                  if (hasUnsavedChanges) {
                    setDiscardConfirmVisible(true);
                  } else {
                    onClose();
                  }
                }}
                disabled={isLoading}
                modifiers={[
                  buttonStyle("glass"),
                  controlSize("large"),
                  buttonBorderShape("circle"),
                ]}
              >
                <Icon
                  name={Icon.select({
                    ios: "xmark",
                    android: import("@expo/material-symbols/close.xml"),
                  })}
                />
              </Button>
            </ConfirmationDialog.Trigger>
            <ConfirmationDialog.Actions>
              <SwiftButton
                label="Discard"
                role="destructive"
                onPress={handleResetAndClose}
              />
              <SwiftButton
                label="Cancel"
                onPress={() => setDiscardConfirmVisible(false)}
              />
            </ConfirmationDialog.Actions>
          </ConfirmationDialog>
        ) : (
          <Button
            variant="outlined"
            onPress={() => {
              if (hasUnsavedChanges) {
                Alert.alert("Discard your progress?", undefined, [
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => setDiscardConfirmVisible(false),
                  },
                  {
                    text: "Discard",
                    style: "destructive",
                    onPress: handleResetAndClose,
                  },
                ]);
              } else {
                onClose();
              }
            }}
            disabled={isLoading}
            modifiers={[
              buttonStyle("glass"),
              controlSize("large"),
              buttonBorderShape("circle"),
            ]}
          >
            <Icon
              name={Icon.select({
                ios: "xmark",
                android: import("@expo/material-symbols/close.xml"),
              })}
            />
          </Button>
        )}
        <Spacer />
        <Button
          onPress={handleSave}
          variant={isFormInvalid ? "outlined" : "filled"}
          modifiers={[
            isFormInvalid
              ? buttonStyle("glass")
              : buttonStyle("borderedProminent"),
            controlSize("large"),
            buttonBorderShape("circle"),
          ]}
          disabled={isLoading || isFormInvalid}
        >
          <Icon
            name={Icon.select({
              ios: "checkmark",
              android: import("@expo/material-symbols/check.xml"),
            })}
          />
        </Button>
      </Row>

      <Column spacing={0} alignment="center">
        <Text
          textStyle={{
            fontSize: 36,
            color: currentTheme.text,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          New Profile
        </Text>
        <FieldGroup>
          <FieldGroup.Section>
            <TextInput
              placeholder="Name"
              editable={!isLoading}
              onChangeText={setName}
              // @ts-ignore
              value={name}
              modifiers={[submitLabel("next")]}
              // @ts-ignore
              textAlign="left"
            />
            <TextInput
              placeholder="Icon URL (optional)"
              editable={!isLoading}
              onChangeText={setIcon}
              // @ts-ignore
              value={icon}
              modifiers={[submitLabel("next")]}
              // @ts-ignore
              textAlign="left"
            />
            <TextInput
              placeholder="Email"
              editable={!isLoading}
              onChangeText={setEmail}
              // @ts-ignore
              value={email}
              modifiers={[submitLabel("next")]}
              keyboardType="email-address"
              // @ts-ignore
              textAlign="left"
            />
            <TextInput
              placeholder="Phone"
              editable={!isLoading}
              onChangeText={setPhone}
              // @ts-ignore
              value={phone}
              modifiers={[submitLabel("next")]}
              keyboardType="phone-pad"
              // @ts-ignore
              textAlign="left"
            />
            {Platform.OS == "ios" && (
              <>
                <DatePicker
                  title="Birthday"
                  selection={birthday}
                  onDateChange={(date) => {
                    setBirthday(date);
                  }}
                />
              </>
            )}
          </FieldGroup.Section>

          <FieldGroup.Section>
            {isMetric ? (
              <Row>
                <TextInput
                  placeholder="Height (cm)"
                  editable={!isLoading}
                  onChangeText={setHeightCm}
                  // @ts-ignore
                  value={heightCm}
                  modifiers={[submitLabel("next")]}
                  keyboardType="number-pad"
                  // @ts-ignore
                  textAlign="left"
                />
                <TextInput
                  placeholder="Weight (kg)"
                  editable={!isLoading}
                  onChangeText={setWeightKg}
                  // @ts-ignore
                  value={weightKg}
                  modifiers={[submitLabel("next")]}
                  keyboardType="number-pad"
                  // @ts-ignore
                  textAlign="left"
                />
              </Row>
            ) : (
              <>
                <Row>
                  <TextInput
                    placeholder="Height (ft)"
                    editable={!isLoading}
                    onChangeText={setHeightFt}
                    // @ts-ignore
                    value={heightFt}
                    modifiers={[submitLabel("next")]}
                    keyboardType="number-pad"
                    // @ts-ignore
                    textAlign="left"
                  />
                  <TextInput
                    placeholder="Height (in)"
                    editable={!isLoading}
                    onChangeText={setHeightIn}
                    // @ts-ignore
                    value={heightIn}
                    modifiers={[submitLabel("next")]}
                    keyboardType="number-pad"
                    // @ts-ignore
                    textAlign="left"
                  />
                </Row>
                <TextInput
                  placeholder="Weight (lb)"
                  editable={!isLoading}
                  onChangeText={setWeightLb}
                  // @ts-ignore
                  value={weightLb}
                  modifiers={[submitLabel("next")]}
                  keyboardType="number-pad"
                  // @ts-ignore
                  textAlign="left"
                />
              </>
            )}
            {/* 🌟 Added alignment="center" to keep text and Picker on the same line */}
            <Row alignment="center">
              <Text>Blood Type</Text>
              <Spacer />
              <Picker
                selectedValue={bloodType}
                onValueChange={setBloodType}
                appearance="menu"
              >
                {bloodTypes.map((b) => (
                  <Picker.Item key={b.value} label={b.label} value={b.value} />
                ))}
              </Picker>
            </Row>
          </FieldGroup.Section>
        </FieldGroup>
        {/* 🌟 Inline visual alert when user selects an age under 18 */}
        {isUnder18 && birthday && (
          <Text
            textStyle={{ fontSize: 13, color: "#FF3B30", textAlign: "center" }}
          >
            Profile holder must be at least 18 years old to use SafeSeat.
          </Text>
        )}
      </Column>
    </Column>
  );

  return (
    <Host matchContents>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        showDragIndicator={false}
        snapPoints={["full"]}
        // 🌟 Sheet-presentation modifiers go on BottomSheet itself (its documented "modifiers"
        // escape hatch), not on a wrapping <Group>. iOS only — Android sizing is handled by snapPoints.
        modifiers={
          Platform.OS === "ios"
            ? [presentationDetents(["medium", "large"])]
            : undefined
        }
      >
        {renderModalContent()}
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    textAlign: "center",
    height: 100,
    fontFamily: "Logo-Font",
    borderWidth: 1,
    borderColor: "#fff",
    marginBottom: 8,
  },
});
