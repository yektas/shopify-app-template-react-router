import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full w-full items-center justify-center p-4 text-center">
      <div className="grid gap-8">
        <h1 className="m-0 p-0 text-[2em] font-bold">
          A short heading about [your app]
        </h1>
        <p className="m-0 p-0 pb-8 text-[1.2rem]">
          A tagline about [your app] that describes your value proposition.
        </p>
        {showForm && (
          <Form
            className="mx-auto flex items-center justify-start gap-4"
            method="post"
            action="/auth/login"
          >
            <label className="grid max-w-80 gap-[0.2rem] text-left text-base">
              <span>Shop domain</span>
              <input
                className="rounded-sm border border-gray-400 bg-white p-[0.4rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                type="text"
                name="shop"
              />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button
              className="cursor-pointer rounded-sm border border-gray-400 bg-gray-100 p-[0.4rem] hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              type="submit"
            >
              Log in
            </button>
          </Form>
        )}
        <ul className="m-0 flex list-none gap-8 p-0 pt-12 max-[50rem]:block">
          <li className="max-w-80 text-left max-[50rem]:pb-4">
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li className="max-w-80 text-left max-[50rem]:pb-4">
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li className="max-w-80 text-left max-[50rem]:pb-4">
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
        </ul>
      </div>
    </div>
  );
}
