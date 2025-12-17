import React from "react";
import { View, Text, TextInput } from "react-native";
import { CustomColors } from "@/constants/CustomColors";

type Props = {
  value: string;
  onChange: (text: string) => void;
  styles: any;
};

export function NoteInput({ value, onChange, styles }: Props) {
  return (
    <View style={styles.noteContainer}>
      <Text style={styles.noteLabel}>Nota (Obligatorio):</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="Escribe una nota explicando el motivo..."
        placeholderTextColor={CustomColors.divider}
        value={value}
        onChangeText={onChange}
        multiline={true}
        numberOfLines={3}
        textAlignVertical="top"
        maxLength={500}
      />
      <Text style={styles.characterCount}>{value.length}/500 caracteres</Text>
    </View>
  );
}
