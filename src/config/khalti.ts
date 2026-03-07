import axios from "axios";

type KhaltiInitiatePayload = {
  return_url: string;
  website_url: string;
  amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info: {
    name: string;
    email: string;
    phone: string;
  };
};

const KHALTI_BASE_URL =
  process.env.KHALTI_BASE_URL || "https://a.khalti.com/api/v2";

const getKhaltiKeys = () => {
  const secretKey = process.env.KHALTI_TEST_SECRET_KEY;
  const publicKey = process.env.KHALTI_TEST_PUBLIC_KEY;

  if (!secretKey) {
    throw new Error("KHALTI_TEST_SECRET_KEY is not configured");
  }

  if (!publicKey) {
    throw new Error("KHALTI_TEST_PUBLIC_KEY is not configured");
  }

  return { secretKey, publicKey };
};

export const initiateKhaltiPayment = async (payload: KhaltiInitiatePayload) => {
  const { secretKey } = getKhaltiKeys();
  try {
    const response = await axios.post(
      `${KHALTI_BASE_URL}/epayment/initiate/`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${secretKey}`,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;
    const errorMessage =
      data?.detail || data?.message || "Failed to initiate Khalti payment";
    throw new Error(errorMessage);
  }
};

export const verifyKhaltiPayment = async (pidx: string) => {
  const { secretKey } = getKhaltiKeys();
  try {
    const response = await axios.post(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${secretKey}`,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;
    const errorMessage =
      data?.detail || data?.message || "Failed to verify Khalti payment";
    throw new Error(errorMessage);
  }
};

export const getKhaltiPublicKey = () => {
  const { publicKey } = getKhaltiKeys();
  return publicKey;
};
