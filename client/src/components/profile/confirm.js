import Swal from "sweetalert2"

export function confirmDialog({ title, text, confirmLabel }) {
  return Swal.fire({
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
    background: "#141418",
    color: "#f1f1f4",
    confirmButtonColor: "#dc4c4c",
    cancelButtonColor: "#2a2a31",
    customClass: { popup: "pf-swal" },
  }).then((r) => r.isConfirmed)
}
