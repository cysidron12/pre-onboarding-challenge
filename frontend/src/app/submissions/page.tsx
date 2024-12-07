"use client";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Stack,
  TextInput,
  Title,
  Loader,
  Table,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

import { DateInput } from "@mantine/dates";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import {
  useCreateSubmissionMutation,
  useSubmissionsQuery,
  useDeleteSubmissionMutation,
  Submissions as SubmissionsDocument,
  SubmissionsQuery,
} from "./Submission.generated";
import { namedOperations } from "../../graphql/namedOperations.generated";
import {
  parsePhoneNumberWithError,
  isValidPhoneNumber,
} from "libphonenumber-js";

const CreateSubmissionForm = () => {
  const [create, { loading }] = useCreateSubmissionMutation({
    // refetchQueries: [namedOperations.Query.Submissions],
    update: (cache, { data }) => {
      const newSubmission = data?.createSubmission;
      const existingSubmissions = cache.readQuery<SubmissionsQuery>({
        query: SubmissionsDocument,
      });

      if (existingSubmissions && newSubmission) {
        cache.writeQuery({
          query: SubmissionsDocument,
          data: {
            submissions: [...existingSubmissions.submissions, newSubmission],
          },
        });
      }
    },
  });

  type FormFields = {
    contractorName: string;
    contractorEmail: string;
    contractorPhone: string;
    policyEffectiveDate: Date | null;
    policyExpirationDate: Date | null;
  };

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<FormFields>({
    mode: "onChange", // run validation on submit
    defaultValues: {
      contractorName: "",
      contractorEmail: "",
      contractorPhone: "",
      policyEffectiveDate: null,
      policyExpirationDate: null,
    },
  });

  const validateEmail = (value: string) => {
    const emailRegex = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(value) ? true : "Please enter a valid email address";
  };

  const validatePhone = (value: string) => {
    if (!value) return "Phone number is required";
    if (!isValidPhoneNumber(value, "US")) {
      return "Please enter a valid US phone number";
    }
    return true;
  };

  const validateExpirationDate = (
    expiration: Date | null,
    allValues: FormFields
  ) => {
    if (!expiration) return "Expiration date is required";
    if (!allValues.policyEffectiveDate) return true;
    const effective = new Date(allValues.policyEffectiveDate);
    const exp = new Date(expiration);
    if (exp <= effective) {
      return "Expiration date must be later than effective date";
    }
    return true;
  };

  const onSubmit = async (formData: FormFields) => {
    const {
      contractorPhone,
      policyEffectiveDate,
      policyExpirationDate,
      ...rest
    } = formData;
    let formattedPhone = contractorPhone;
    try {
      const phoneNumber = parsePhoneNumberWithError(contractorPhone, "US");
      formattedPhone = phoneNumber.format("E.164");
    } catch (error) {
      // If parsing fails, we keep the original value (though validation should prevent this)
    }

    await create({
      variables: {
        input: {
          ...rest,
          contractorPhone: formattedPhone,
          policyEffectiveDate: policyEffectiveDate?.toISOString() ?? "",
          policyExpirationDate: policyExpirationDate?.toISOString() ?? "",
        },
      },
    });

    reset();
  };

  return (
    <Box w="50%" mx="auto" mt="xl">
      <Title order={4}>Add Submission</Title>

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Contractor Name"
            required
            placeholder="John Doe"
            error={errors.contractorName?.message}
            {...register("contractorName", {
              required: "Name is required",
              minLength: {
                value: 2,
                message: "Name must be at least 2 characters",
              },
            })}
          />

          <TextInput
            label="Contractor Email"
            placeholder="john@example.com"
            required
            error={errors.contractorEmail?.message}
            {...register("contractorEmail", {
              required: "Email is required",
              validate: validateEmail,
            })}
          />

          <TextInput
            label="Contractor Phone"
            placeholder="(555) 555-5555"
            required
            error={errors.contractorPhone?.message}
            {...register("contractorPhone", {
              required: "Phone number is required",
              validate: validatePhone,
            })}
          />

          <Controller
            name="policyEffectiveDate"
            control={control}
            rules={{ required: "Effective date is required" }}
            render={({ field, fieldState }) => (
              <DateInput
                required
                label="Policy Effective Date"
                placeholder="Policy Effective Date"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                highlightToday
              />
            )}
          />

          <Controller
            name="policyExpirationDate"
            control={control}
            rules={{
              required: "Expiration date is required",
              validate: (value, allValues) =>
                validateExpirationDate(value, allValues),
            }}
            render={({ field, fieldState }) => (
              <DateInput
                required
                label="Policy Expiration Date"
                placeholder="Policy Expiration Date"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                highlightToday
              />
            )}
          />

          <Button type="submit" loading={loading}>
            Add
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

const SubmissionList = () => {
  const { loading, error, data } = useSubmissionsQuery();
  const [deleteSubmission] = useDeleteSubmissionMutation({
    refetchQueries: [namedOperations.Query.Submissions],
  });

  if (error) {
    return <Alert title="uh oh">{error.message}</Alert>;
  }

  const handleDelete = async (id: string | null | undefined) => {
    if (!id) return;
    try {
      await deleteSubmission({
        variables: { id },
      });
    } catch (error) {
      console.error("Failed to delete submission:", error);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Group>
        <Title order={5}>All Submissions</Title>
      </Group>
      <Divider mb="sm" />

      {loading ? (
        <Loader size="xs" type="bars" />
      ) : data && data.submissions.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Submission ID</Table.Th>
              <Table.Th>Contractor Name</Table.Th>
              <Table.Th>Contractor Email</Table.Th>
              <Table.Th>Contractor Phone</Table.Th>
              <Table.Th>Policy Effective Date</Table.Th>
              <Table.Th>Policy Expiration Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.submissions.map((submission) => (
              <Table.Tr key={submission.id}>
                <Table.Td>{submission.id}</Table.Td>
                <Table.Td>{submission.contractorName}</Table.Td>
                <Table.Td>{submission.contractorEmail}</Table.Td>
                <Table.Td>{submission.contractorPhone}</Table.Td>
                <Table.Td>
                  {formatDate(submission.policyEffectiveDate)}
                </Table.Td>
                <Table.Td>
                  {formatDate(submission.policyExpirationDate)}
                </Table.Td>
                <Table.Td>
                  <Button
                    color="red"
                    size="xs"
                    variant="outline"
                    onClick={() => handleDelete(submission.id)}
                    disabled={!submission.id}
                  >
                    Delete
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Alert>No submissions submitted yet</Alert>
      )}
    </Box>
  );
};

export default function Submissions() {
  return (
    <Container p="md" size="lg">
      <Stack gap="sm">
        <Title>Submissions</Title>
        <Anchor component={Link} href="/">
          Back Home
        </Anchor>
        <Divider />
        <CreateSubmissionForm />
        <SubmissionList />
      </Stack>
    </Container>
  );
}
