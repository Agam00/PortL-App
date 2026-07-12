import { Component } from "react";
import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled error in app tree:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
          <Text className="text-center text-headline-md font-semibold text-on-surface">
            Something went wrong
          </Text>
          <Text className="text-center text-body-sm text-text-muted">
            {this.state.error.message}
          </Text>
          <Button onPress={() => this.setState({ error: null })}>Try again</Button>
        </View>
      );
    }

    return this.props.children;
  }
}
