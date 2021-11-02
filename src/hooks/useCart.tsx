import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { BussinessError } from '../errors/BusinessError';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const CART_KEY = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateCart = (updatedCart: Product[]) => {
    setCart(updatedCart);
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const product = (await api.get<Product>(`products/${productId}`)).data;
      const productStock = (await api.get<Stock>(`stock/${productId}`)).data;

      let newAmount = 0;
      let updatedCart = cart.map(item => {
        if (item.id === productId) {
          newAmount = item.amount + 1;
          return {...item, amount: newAmount}
        }

        return item;
      });
      if (newAmount === 0) {
        newAmount = 1;
        updatedCart = [
          ...cart,
          { ...product, amount: newAmount }
        ];
      }

      if (newAmount > productStock.amount) {
        throw new BussinessError('Quantidade solicitada fora de estoque');
      }

      updateCart(updatedCart);
    } catch (err: any) {
      if (err instanceof BussinessError) {
        toast.error(err.message);
      } else {
        toast.error('Erro na adição do produto');
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(product => product.id !== productId);

      if (updatedCart.length === cart.length) {
        throw new BussinessError('Erro na remoção do produto');
      }

      updateCart(updatedCart);
    } catch (err: any) {
      if (err instanceof BussinessError) {
        toast.error(err.message);
      }
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = (await api.get<Stock>(`stock/${productId}`)).data;
      
      if (amount > productStock.amount || amount <= 0) {
        throw new BussinessError('Quantidade solicitada fora de estoque');
      }
      
      const updatedCart = cart.map(item => {
        if (item.id === productId) {
          item.amount = amount;

        }

        return item;
      });
      updateCart(updatedCart);
    } catch (err: any) {
      if (err instanceof BussinessError) {
        toast.error(err.message);
      } else {
        toast.error('Erro na alteração de quantidade do produto');
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
