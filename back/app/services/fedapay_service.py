import httpx
from fastapi import HTTPException
from ..config import get_settings

settings = get_settings()


class FedaPayService:
    """Service pour gérer les interactions avec l'API FedaPay"""
    
    @staticmethod
    def get_headers():
        return {
            "Authorization": f"Bearer {settings.fedapay_secret_key}",
            "Content-Type": "application/json",
        }

    @classmethod
    async def initiate_payment(cls, amount: int, user_info: dict, callback_url: str, description: str, metadata: dict = None) -> dict:
        """
        Initie une transaction FedaPay (collecte ou remboursement).
        Compatible avec le mode sandbox.

        Returns: { payment_url, transaction_id }
        """
        payload = {
            "description": description,
            "amount": amount,
            "currency": {"iso": "XOF"},
            "callback_url": callback_url,
            "customer": user_info,
            "custom_metadata": metadata or {}
        }

        headers = cls.get_headers()

        async with httpx.AsyncClient() as client:
            try:
                # 1. Créer la transaction
                response = await client.post(
                    f"{settings.fedapay_api_url}/transactions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()

                transaction_data = response.json()

                # FedaPay wraps the response: {"v1/transaction": {...}}
                transaction = transaction_data.get("v1/transaction", transaction_data)
                transaction_id = transaction.get("id")

                if not transaction_id:
                    raise HTTPException(status_code=500, detail="Impossible d'obtenir l'ID de transaction FedaPay")

                # 2. Générer le token pour l'URL de paiement
                token_response = await client.post(
                    f"{settings.fedapay_api_url}/transactions/{transaction_id}/token",
                    headers=headers
                )
                token_response.raise_for_status()

                token_data = token_response.json()

                # Récupération double pour compatibilité avec tous les formats FedaPay
                token_obj = token_data.get("v1/transaction_token", token_data)
                payment_url = token_obj.get("url")

                if not payment_url:
                    payment_url = token_data.get("url")

                if not payment_url:
                    raise HTTPException(status_code=500, detail="Impossible d'obtenir l'URL de paiement FedaPay")

                return {
                    "transaction_id": transaction_id,
                    "payment_url": payment_url
                }

            except httpx.HTTPStatusError as e:
                error_detail = e.response.text
                print(f"[FedaPay] Erreur HTTP: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erreur FedaPay lors de l'initiation du paiement: {error_detail}"
                )
            except HTTPException:
                raise
            except Exception as e:
                print(f"[FedaPay] Erreur: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erreur FedaPay lors de l'initiation: {str(e)}"
                )

    @classmethod
    async def create_payout(cls, amount: int, customer_info: dict, mode: str = "mtn_open") -> dict:
        """
        Crée un payout FedaPay (décaissement direct — nécessite permissions spéciales en prod).
        En sandbox, cette méthode retourne une erreur 403 — utiliser initiate_payment à la place.
        """
        payload = {
            "amount": amount,
            "currency": {"iso": "XOF"},
            "mode": mode,
            "customer": customer_info
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.fedapay_api_url}/payouts",
                    headers=cls.get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"[FedaPay] Payout erreur HTTP: {e.response.text}")
                raise HTTPException(status_code=500, detail=f"Erreur FedaPay Payout: {e.response.text}")
            except Exception as e:
                print(f"[FedaPay] Payout erreur: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Erreur FedaPay Payout: {str(e)}")

    @classmethod
    async def get_transaction_status(cls, transaction_id: str) -> str:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{settings.fedapay_api_url}/transactions/{transaction_id}",
                    headers=cls.get_headers()
                )
                response.raise_for_status()
                data = response.json()
                transaction = data.get("v1/transaction", data)
                status = transaction.get("status")
                if not status:
                    status = data.get("status")
                return status or "unknown"
            except Exception:
                return "unknown"
