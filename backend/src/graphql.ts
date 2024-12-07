import SchemaBuilder from "@pothos/core";
import { createYoga } from "graphql-yoga";

import { GraphQLDate, GraphQLDateTime } from "graphql-scalars";
import { Prisma, PrismaClient, User, Submission } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "./prisma";
import { createUser, CreateUserArgs, getUsers } from "./lib/user";

//Shared context that is injected into every rejquest
export interface AppContext {
  prisma: PrismaClient;
}

export interface SchemaTypes {
  Scalars: {
    JSON: {
      Input: Prisma.JsonValue;
      Output: Prisma.JsonValue;
    };
    JSONObject: {
      Input: Prisma.JsonValue;
      Output: Prisma.JsonValue;
    };
    Date: {
      Input: Date;
      Output: Date;
    };
    DateTime: {
      Input: string;
      Output: Date;
    };
    ID: {
      Input: string;
      Output: string;
    };
  };
  Context: AppContext;
}
export type TypesWithDefaults =
  PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>;

const builder = new SchemaBuilder<TypesWithDefaults>({});

// Register useful types
builder.addScalarType("DateTime", GraphQLDateTime, {});
builder.addScalarType("Date", GraphQLDate, {});

// Add top level query and mutaiton
builder.queryType({ description: "Query root" });
builder.mutationType({ description: "Mutation root" });

//Expose User Object to graphql
const UserObject = builder.objectRef<User>("User").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    email: t.exposeString("email"),
  }),
});

//Expose users query
builder.queryField("users", (t) =>
  t.field({
    type: [UserObject],
    nullable: false,
    resolve: (_parent, _args, context) => getUsers(context),
  })
);

//Expose create user args
const CreateUserInput = builder
  .inputRef<CreateUserArgs>("CreateUserInput")
  .implement({
    fields: (t) => ({
      name: t.string({ required: true }),
      email: t.string({ required: true }),
    }),
  });

//Expose create user mutation
builder.mutationField("createUser", (t) =>
  t.field({
    type: UserObject,
    nullable: false,
    args: {
      input: t.arg({
        type: CreateUserInput,
        required: true,
      }),
    },
    resolve: (_parent, args, context) => createUser(args.input, context),
  })
);

// Add Submission input type
interface CreateSubmissionArgs {
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  policyEffectiveDate: string;
  policyExpirationDate: string;
}

// Expose Submission Object to GraphQL
const SubmissionObject = builder.objectRef<Submission>("Submission").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    contractorName: t.exposeString("contractorName"),
    contractorEmail: t.exposeString("contractorEmail"),
    contractorPhone: t.exposeString("contractorPhone"),
    policyEffectiveDate: t.expose("policyEffectiveDate", { type: "DateTime" }),
    policyExpirationDate: t.expose("policyExpirationDate", {
      type: "DateTime",
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
  }),
});

// Expose submissions query
builder.queryField("submissions", (t) =>
  t.field({
    type: [SubmissionObject],
    nullable: false,
    resolve: (_parent, _args, context) => {
      return context.prisma.submission.findMany();
    },
  })
);

// Expose create submission input
const CreateSubmissionInput = builder
  .inputRef<CreateSubmissionArgs>("CreateSubmissionInput")
  .implement({
    fields: (t) => ({
      contractorName: t.string({ required: true }),
      contractorEmail: t.string({ required: true }),
      contractorPhone: t.string({ required: true }),
      policyEffectiveDate: t.string({ required: true }),
      policyExpirationDate: t.string({ required: true }),
    }),
  });

// Expose create submission mutation
builder.mutationField("createSubmission", (t) =>
  t.field({
    type: SubmissionObject,
    nullable: false,
    args: {
      input: t.arg({
        type: CreateSubmissionInput,
        required: true,
      }),
    },
    resolve: (_parent, args, context) => {
      return context.prisma.submission.create({
        data: {
          ...args.input,
          policyEffectiveDate: new Date(args.input.policyEffectiveDate),
          policyExpirationDate: new Date(args.input.policyExpirationDate),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    },
  })
);

// Expose delete submission mutation
builder.mutationField("deleteSubmission", (t) =>
  t.field({
    type: SubmissionObject,
    nullable: false,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      return context.prisma.submission.delete({
        where: { id: args.id },
      });
    },
  })
);

/**
 * Builds GraphQL Schema and creates request handler
 */
export const getServer = () => {
  const builderSchema = builder.toSchema({});

  return createYoga<{
    req: FastifyRequest;
    reply: FastifyReply;
  }>({
    graphqlEndpoint: "/api/graphql",
    schema: builderSchema,
    maskedErrors: false,
    context: async () => {
      //Pass prisma client to request context
      const context: AppContext = {
        prisma,
      };

      return context;
    },
  });
};
