import Swal from "sweetalert2";

type ConfirmOptions = {
  title: string;
  text: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

export async function confirmAction({
  title,
  text,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });

  return result.isConfirmed;
}

export async function confirmDelete(itemLabel: string): Promise<boolean> {
  return confirmAction({
    title: `Delete ${itemLabel}?`,
    text: "This action cannot be undone.",
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
  });
}
