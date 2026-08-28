import { createInvoiceWithApi } from '@src/api/factories/invoice.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { DATE_TIME_REGEX } from '@src/ui/utils/date.util';

test.describe('Verify invoices', () => {
  test(
    'placed order appears in the invoice list with correct details',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({ invoicesPage, loginAsFreshUser, placeCodOrderAsLoggedInUser }) => {
      await loginAsFreshUser();

      const order = await placeCodOrderAsLoggedInUser();

      await invoicesPage.gotoAndAwaitLoaded();

      await expect(
        invoicesPage.invoiceRowCell(order.invoiceNumber, 'invoiceNumber'),
      ).toHaveText(order.invoiceNumber);
      await expect(
        invoicesPage.invoiceRowCell(order.invoiceNumber, 'billingAddress'),
      ).not.toBeEmpty();
      await expect(
        invoicesPage.invoiceRowCell(order.invoiceNumber, 'invoiceDate'),
      ).toHaveText(DATE_TIME_REGEX);
      await expect(
        invoicesPage.invoiceRowCell(order.invoiceNumber, 'total'),
      ).toHaveText(order.total);
    },
  );

  test(
    'invoice detail page shows number, address, payment method, and line items',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({ invoiceDetailPage, invoicesPage, loginAsFreshUser, request }) => {
      const user = await loginAsFreshUser();
      const order = await createInvoiceWithApi(request, user);
      // The API reports the total as a number (14.15), rebuilt here into each
      // page's own render format.
      const amount = order.total.toFixed(2);

      await invoicesPage.gotoAndAwaitLoaded();
      await invoicesPage.openDetails(order.invoiceNumber);

      await expect(invoiceDetailPage.invoiceNumber).toHaveValue(
        order.invoiceNumber,
      );
      await expect(invoiceDetailPage.invoiceDate).toHaveValue(DATE_TIME_REGEX);
      await expect(invoiceDetailPage.total).toHaveValue(`$ ${amount}`);

      await expect(invoiceDetailPage.street).not.toHaveValue('');
      await expect(invoiceDetailPage.postalCode).toHaveValue('12345');
      await expect(invoiceDetailPage.city).not.toHaveValue('');
      await expect(invoiceDetailPage.state).not.toHaveValue('');
      await expect(invoiceDetailPage.country).not.toHaveValue('');

      await expect(invoiceDetailPage.paymentMethod).toHaveValue(
        'Cash on Delivery',
      );

      await expect(invoiceDetailPage.lineItemCell(0, 'quantity')).toHaveText(
        '1',
      );
      await expect(invoiceDetailPage.lineItemCell(0, 'product')).toHaveText(
        order.product.name,
      );
      await expect(invoiceDetailPage.lineItemCell(0, 'price')).toHaveText(
        `$${amount}`,
      );
    },
  );

  test(
    'non-existent invoice id shows a not-found message',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({ invoiceDetailPage, loginAsFreshUser }) => {
      await loginAsFreshUser();

      await invoiceDetailPage.gotoInvoice('01kx0000000000000000000000');

      await expect(invoiceDetailPage.notFoundMessage).toBeVisible();
      await expect(invoiceDetailPage.invoiceNumber).toHaveCount(0);
    },
  );
});
