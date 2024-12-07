import { Anchor, Container, Divider, Group, Stack, Title } from "@mantine/core";
import Link from "next/link";
import ShepherdSvg from "./ShepherdSvg";

export default function Home() {
  return (
    <Container p="xl" size="xs">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title>Hello World!</Title>
          <ShepherdSvg />
        </Group>
        <Divider />
        <Title order={4}>Links</Title>
        <Anchor component={Link} href="/users">
          Users
        </Anchor>
        <Anchor component={Link} href="/submissions">
          Submissions
        </Anchor>
      </Stack>
    </Container>
  );
}
